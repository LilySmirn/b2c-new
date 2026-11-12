"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PrescriptionChecklist from "../components/PrescriptionChecklist";
import type { ChecklistSection, SelectedPrescription } from "../components/PrescriptionChecklist";
import SideCart from "../components/SideCart";
import styles from "./cart.module.css";
import type { CartTemplate } from "@/app/(directory)/components/cartTemplatesStorage";
import DirectoryPageHeader from "@/app/(directory)/components/DirectoryPageHeader";
import { fetchEncryptedJson } from "@/app/lib/encryptedPayload/client";
import {
  CART_VISIT_STORAGE_KEY,
  createEventId,
  sendOpeningEvent,
  type CartVisit,
} from "@/app/modules/clinicalRecommendationOpening/client";
import { collectMedicationQuery } from "../components/medications/medicationQuery";
import { medsCatalogSession } from "../components/medications/medsCatalogSession";
import {
  cartStorage,
  getCartSync,
  getRecommendationStorageKey,
  getStoredCartRecommendation,
  normalizeStoredSelectionItems,
  subscribeCartSync,
  writeStoredSelections,
  type StoredCartRecommendation,
} from "@/app/(directory)/shared/cart";
import MiniCartHost, {
  type MiniCartHostHandle,
} from "@/app/modules/miniCart/MiniCartHost";
import { MINI_CART_PREVIEW_ENABLED } from "@/app/modules/miniCart/featureFlag";
import type { MiniCartDisplayMode } from "@/app/modules/miniCart/types";

type AppendixA3Table = {
  name: string | null;
  html: string;
  comment: string | null;
};

const applyStoredSelections = (
  sections: ChecklistSection[],
  selectedItems: SelectedPrescription[],
) => {
  const selectedItemMap = new Map(selectedItems.map((item) => [item.id, item]));

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const storedItem = selectedItemMap.get(item.id);

      return {
        ...item,
        checked: Boolean(storedItem),
        comment: storedItem?.comment ?? item.comment,
      };
    }),
  }));
};

const getDiagnosisCodeFromTitle = (title: string) => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return "";

  return trimmedTitle.split(":")[0]?.trim() ?? trimmedTitle;
};

const sameSelectionIds = (
  left: SelectedPrescription[],
  right: SelectedPrescription[],
) => {
  if (left.length !== right.length) return false;

  return left.every((item, index) => {
    const other = right[index];
    return (
      item.id === other.id &&
      item.comment === other.comment &&
      item.title === other.title
    );
  });
};

export default function CartPreviewPage() {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<SelectedPrescription[]>([]);
  const [uncheckItemId, setUncheckItemId] = useState<string | null>(null);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const [diagnosisTitle, setDiagnosisTitle] = useState("");
  const [diagnosisCode, setDiagnosisCode] = useState("");
  const [recommendationId, setRecommendationId] = useState("");
  const [recommendationSource, setRecommendationSource] = useState("");
  const [recommendationTitle, setRecommendationTitle] = useState("");
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>([]);
  const [recommendationKey, setRecommendationKey] = useState("");
  const [appliedTemplateItems, setAppliedTemplateItems] = useState<SelectedPrescription[] | null>(null);
  const [appendixA3Tables, setAppendixA3Tables] = useState<AppendixA3Table[]>([]);
  const [isAppendixA3Loading, setIsAppendixA3Loading] = useState(false);
  const [appendixA3Error, setAppendixA3Error] = useState("");
  const [isCartReady, setIsCartReady] = useState(false);
  const isRestoringStoredSelectionsRef = useRef(false);
  const syncApplyingRef = useRef(false);
  const baseSectionsRef = useRef<ChecklistSection[]>([]);
  const recommendationKeyRef = useRef("");
  const selectedItemsRef = useRef<SelectedPrescription[]>([]);
  const [checklistSyncEpoch, setChecklistSyncEpoch] = useState(0);
  const [miniCartMode, setMiniCartMode] =
    useState<MiniCartDisplayMode>("full");
  const miniCartRef = useRef<MiniCartHostHandle>(null);

  recommendationKeyRef.current = recommendationKey;
  selectedItemsRef.current = selectedItems;

  const handleMiniCartCollapse = useCallback(() => {
    void miniCartRef.current?.requestCompactFromGesture();
  }, []);

  const loadAppendixA3 = useCallback((crMId: string | undefined) => {
    if (!crMId?.trim()) {
      setAppendixA3Tables([]);
      setAppendixA3Error("Для выбранной рекомендации не найден идентификатор приложения А3.");
      setIsAppendixA3Loading(false);
      return;
    }

    setIsAppendixA3Loading(true);
    setAppendixA3Error("");
    fetchEncryptedJson<{ tables?: AppendixA3Table[] }>(
      `/api/cr-tables?cr_m_id=${encodeURIComponent(crMId)}`,
    )
      .then(({ response, data }) => {
        if (!response.ok || !data) {
          throw new Error("Failed to load Appendix A3 tables");
        }

        return data;
      })
      .then((data) => {
        setAppendixA3Tables(Array.isArray(data.tables) ? data.tables : []);
      })
      .catch(() => {
        setAppendixA3Tables([]);
        setAppendixA3Error("Не удалось загрузить таблицы приложения А3. Попробуйте позже.");
      })
      .finally(() => setIsAppendixA3Loading(false));
  }, []);

  const hydrateFromStorage = useCallback(() => {
    const storedValue = getStoredCartRecommendation();
    if (!storedValue) {
      return false;
    }

    try {
      const parsed = JSON.parse(storedValue) as StoredCartRecommendation;
      const currentRecommendationKey = getRecommendationStorageKey(parsed);
      const storedSelectedItems = normalizeStoredSelectionItems(
        cartStorage.readSelectionsForKey(currentRecommendationKey),
      );

      const currentDiagnosisTitle =
        typeof parsed.diagnosisTitle === "string" ? parsed.diagnosisTitle : "";
      const prescriptions = Array.isArray(parsed.recommendation?.prescriptions)
        ? (parsed.recommendation.prescriptions as ChecklistSection[])
        : [];

      setDiagnosisTitle(currentDiagnosisTitle);
      setDiagnosisCode(getDiagnosisCodeFromTitle(currentDiagnosisTitle));
      setRecommendationId(
        typeof parsed.recommendation?.id === "string" ? parsed.recommendation.id : "",
      );
      setRecommendationSource(
        typeof parsed.recommendation?.source === "string"
          ? parsed.recommendation.source
          : "",
      );
      setRecommendationTitle(
        typeof parsed.recommendation?.title === "string"
          ? parsed.recommendation.title
          : "",
      );
      isRestoringStoredSelectionsRef.current = true;
      setRecommendationKey(currentRecommendationKey);
      recommendationKeyRef.current = currentRecommendationKey;
      baseSectionsRef.current = prescriptions;

      if (currentRecommendationKey && prescriptions.length > 0) {
        const query = collectMedicationQuery(prescriptions);
        medsCatalogSession.ensure(currentRecommendationKey, query.names, query.ids);
      }

      loadAppendixA3(
        typeof parsed.recommendation?.id === "string"
          ? parsed.recommendation.id.trim()
          : undefined,
      );

      setSelectedItems(storedSelectedItems);
      selectedItemsRef.current = storedSelectedItems;
      setChecklistSections(
        applyStoredSelections(prescriptions, storedSelectedItems),
      );
      setAppliedTemplateItems(null);
      setIsCartReady(true);
      return true;
    } catch {
      return false;
    }
  }, [loadAppendixA3]);

  useEffect(() => {
    getCartSync().start();
  }, []);

  useEffect(() => {
    let visit: CartVisit | undefined;
    try {
      visit = JSON.parse(
        window.sessionStorage.getItem(CART_VISIT_STORAGE_KEY) ?? "null",
      ) as CartVisit | undefined;
    } catch {
      return;
    }
    if (!visit?.visitId || !visit.recommendationKey) return;

    void sendOpeningEvent({
      eventId: createEventId(),
      type: "cart_opened",
      ...visit,
    });

    const leaveEventId = createEventId();
    const reportLeave = () => {
      void sendOpeningEvent({
        eventId: leaveEventId,
        type: "cart_left",
        visitId: visit.visitId,
      }, true);
    };
    window.addEventListener("pagehide", reportLeave, { once: true });
    return () => {
      window.removeEventListener("pagehide", reportLeave);
      reportLeave();
    };
  }, []);

  useEffect(() => {
    if (!hydrateFromStorage()) {
      router.replace("/mkb");
      setDiagnosisTitle("");
      setDiagnosisCode("");
      setRecommendationId("");
      setRecommendationSource("");
      setRecommendationTitle("");
      setChecklistSections([]);
      setRecommendationKey("");
      setAppendixA3Tables([]);
      setIsAppendixA3Loading(false);
      setAppendixA3Error("");
      setIsCartReady(false);
    }
  }, [hydrateFromStorage, router]);

  useEffect(() => {
    return subscribeCartSync((message) => {
      // Собственный publish уже отражён в React-state этой вкладки.
      if (message.origin === "local") return;

      if (message.scopes.includes("cleared")) {
        router.replace("/mkb");
        return;
      }

      if (message.scopes.includes("recommendation")) {
        if (!hydrateFromStorage()) {
          router.replace("/mkb");
        } else {
          setChecklistSyncEpoch((value) => value + 1);
        }
        return;
      }

      if (!message.scopes.includes("selections")) return;

      const storedRecommendation = cartStorage.readRecommendation();
      const key = storedRecommendation
        ? getRecommendationStorageKey(storedRecommendation)
        : recommendationKeyRef.current;
      if (!key) return;

      if (
        Array.isArray(storedRecommendation?.recommendation?.prescriptions)
      ) {
        baseSectionsRef.current = storedRecommendation.recommendation
          .prescriptions as ChecklistSection[];
      }

      const nextItems = cartStorage.readSelectionsForKey(key);
      if (sameSelectionIds(selectedItemsRef.current, nextItems)) return;

      syncApplyingRef.current = true;
      isRestoringStoredSelectionsRef.current = true;
      setSelectedItems(nextItems);
      selectedItemsRef.current = nextItems;
      setRecommendationKey(key);
      recommendationKeyRef.current = key;
      setChecklistSections(
        applyStoredSelections(baseSectionsRef.current, nextItems),
      );
      setAppliedTemplateItems(null);
      // Remount checklist, чтобы сбросить устаревший внутренний sections
      // до того, как onSelectionChange успеет затереть remote-состояние.
      setChecklistSyncEpoch((value) => value + 1);
      queueMicrotask(() => {
        syncApplyingRef.current = false;
      });
    });
  }, [hydrateFromStorage, router]);

  const handleSelectionChange = useCallback((items: SelectedPrescription[]) => {
    if (syncApplyingRef.current) {
      selectedItemsRef.current = items;
      return;
    }

    if (isRestoringStoredSelectionsRef.current && items.length === 0) {
      isRestoringStoredSelectionsRef.current = false;
      return;
    }

    isRestoringStoredSelectionsRef.current = false;
    setSelectedItems(items);
    selectedItemsRef.current = items;
    writeStoredSelections(recommendationKey, items);
  }, [recommendationKey]);

  const handleDeleteItem = (id: string) => {
    setSelectedItems((prev) => {
      const nextItems = prev.filter((item) => item.id !== id);
      selectedItemsRef.current = nextItems;
      writeStoredSelections(recommendationKey, nextItems);
      return nextItems;
    });
    setUncheckItemId(id);
  };

  const handleDeleteAll = () => {
    setSelectedItems([]);
    selectedItemsRef.current = [];
    writeStoredSelections(recommendationKey, []);
    setClearSelectionSignal((prev) => prev + 1);
    setAppliedTemplateItems(null);
  };

  const handleApplyTemplate = (template: CartTemplate) => {
    setSelectedItems(template.items);
    selectedItemsRef.current = template.items;
    setAppliedTemplateItems(template.items);
    writeStoredSelections(recommendationKey, template.items);
  };

  if (!isCartReady) {
    return null;
  }
  
  const fullCartVisible = miniCartMode === "full";

  return (
    <>
      <DirectoryPageHeader
        variant="cart"
        diagnosisTitle={diagnosisTitle}
        recommendationId={recommendationId}
        recommendationSource={recommendationSource}
        onCollapse={
          MINI_CART_PREVIEW_ENABLED ? handleMiniCartCollapse : undefined
        }
        collapseHidden={!fullCartVisible}
      />
      <main
        className={styles.page}
        hidden={!fullCartVisible}
        aria-hidden={!fullCartVisible}
      >
      <section className={styles.layout}>
        <PrescriptionChecklist
          key={checklistSyncEpoch}
          onSelectionChange={handleSelectionChange}
          uncheckItemId={uncheckItemId}
          onUncheckHandled={() => setUncheckItemId(null)}
          clearSelectionSignal={clearSelectionSignal}
          initialSections={checklistSections}
          appliedTemplateItems={appliedTemplateItems}
          appendixA3Tables={appendixA3Tables}
          isAppendixA3Loading={isAppendixA3Loading}
          appendixA3Error={appendixA3Error}
          medsRecommendationKey={recommendationKey}
        />
        <SideCart
          selectedItems={selectedItems}
          onDeleteItem={handleDeleteItem}
          onDeleteAll={handleDeleteAll}
          onApplyTemplate={handleApplyTemplate}
          diagnosisCode={diagnosisCode}
          recommendationTitle={recommendationTitle}
          storageKey={recommendationKey}
        />
      </section>
      </main>
      {MINI_CART_PREVIEW_ENABLED ? (
        <MiniCartHost
          ref={miniCartRef}
          force
          diagnosis={diagnosisTitle || "Назначения"}
          tabs={[
            { id: "drugs", label: "Препараты", active: true, enabled: true },
          ]}
          drugItems={[]}
          shellTabs={{}}
          displayMode={miniCartMode}
          onDisplayModeChange={setMiniCartMode}
        />
      ) : null}
    </>
  );
}
