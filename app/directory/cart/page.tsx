"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PrescriptionChecklist from "../components/PrescriptionChecklist";
import type { ChecklistSection, SelectedPrescription } from "../components/PrescriptionChecklist";
import SideCart from "../components/SideCart";
import styles from "./cart.module.css";
import type { CartTemplate } from "@/app/directory/components/cartTemplatesStorage";
import DirectoryPageHeader from "@/app/directory/components/DirectoryPageHeader";
import { fetchEncryptedJson } from "@/app/lib/encryptedPayload/client";

type StoredCartRecommendation = {
  diagnosisTitle?: string;
  recommendationKey?: string;
  recommendation?: {
    id?: string;
    title?: string;
    mkbCodes?: string[];
    source?: string;
    prescriptions?: ChecklistSection[];
  };
};

type StoredCartSelections = Record<string, SelectedPrescription[]>;

type AppendixA3Table = {
  name: string | null;
  html: string;
  comment: string | null;
};

const CART_RECOMMENDATION_STORAGE_KEY = "directoryCartRecommendation";
const CART_SELECTIONS_STORAGE_KEY = "directoryCartSelections";

const getStoredCartRecommendation = () =>
  window.sessionStorage.getItem(CART_RECOMMENDATION_STORAGE_KEY) ??
  window.localStorage.getItem(CART_RECOMMENDATION_STORAGE_KEY);

const getRecommendationStorageKey = (data: StoredCartRecommendation) => {
  if (data.recommendationKey) return data.recommendationKey;

  const recommendation = data.recommendation;

  return [
    data.diagnosisTitle,
    recommendation?.id,
    recommendation?.title,
    recommendation?.mkbCodes?.join(","),
  ]
    .filter(Boolean)
    .join("|");
};

const readStoredSelections = (): StoredCartSelections => {
  const storedValue =
    window.sessionStorage.getItem(CART_SELECTIONS_STORAGE_KEY) ??
    window.localStorage.getItem(CART_SELECTIONS_STORAGE_KEY);
  if (!storedValue) return {};

  try {
    const parsed = JSON.parse(storedValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredCartSelections)
      : {};
  } catch {
    return {};
  }
};

const normalizeStoredSelectionItems = (
  storedSelection: unknown,
): SelectedPrescription[] => {
  if (!Array.isArray(storedSelection)) return [];

  return storedSelection
    .map((item) => {
      if (typeof item === "string") {
        return { id: item, comment: "" } as SelectedPrescription;
      }

      if (item && typeof item === "object" && "id" in item) {
        return {
          ...(item as SelectedPrescription),
          id: String((item as { id: unknown }).id),
          comment:
            typeof (item as { comment?: unknown }).comment === "string"
              ? (item as { comment: string }).comment
              : "",
        };
      }

      return null;
    })
    .filter((item): item is SelectedPrescription => Boolean(item?.id));
};

const writeStoredSelections = (
  recommendationKey: string,
  selectedItems: SelectedPrescription[],
) => {
  if (!recommendationKey) return;

  const storedSelections = readStoredSelections();

  if (selectedItems.length > 0) {
    storedSelections[recommendationKey] = selectedItems;
  } else {
    delete storedSelections[recommendationKey];
  }

  const serializedSelections = JSON.stringify(storedSelections);

  window.sessionStorage.setItem(
    CART_SELECTIONS_STORAGE_KEY,
    serializedSelections,
  );
  window.localStorage.setItem(CART_SELECTIONS_STORAGE_KEY, serializedSelections);
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

  useEffect(() => {
    const storedValue = getStoredCartRecommendation();
    if (!storedValue) {
      router.replace("/directory/search");
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as StoredCartRecommendation;
      const currentRecommendationKey = getRecommendationStorageKey(parsed);
      const storedSelectedItems = normalizeStoredSelectionItems(
        readStoredSelections()[currentRecommendationKey],
      );

      const currentDiagnosisTitle = parsed.diagnosisTitle ?? "";

      setDiagnosisTitle(currentDiagnosisTitle);
      setDiagnosisCode(getDiagnosisCodeFromTitle(currentDiagnosisTitle));
      setRecommendationId(parsed.recommendation?.id ?? "");
      setRecommendationSource(parsed.recommendation?.source ?? "");
      setRecommendationTitle(parsed.recommendation?.title ?? "");
      isRestoringStoredSelectionsRef.current = true;
      setRecommendationKey(currentRecommendationKey);

      const crMId = parsed.recommendation?.id?.trim();
      if (crMId) {
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
      } else {
        setAppendixA3Tables([]);
        setAppendixA3Error("Для выбранной рекомендации не найден идентификатор приложения А3.");
      }

      setChecklistSections(
        applyStoredSelections(
          parsed.recommendation?.prescriptions ?? [],
          storedSelectedItems,
        ),
      );
      setIsCartReady(true);
    } catch {
      router.replace("/directory/search");
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
  }, [router]);

  const handleSelectionChange = useCallback((items: SelectedPrescription[]) => {
    if (isRestoringStoredSelectionsRef.current && items.length === 0) {
      isRestoringStoredSelectionsRef.current = false;
      return;
    }

    isRestoringStoredSelectionsRef.current = false;
    setSelectedItems(items);
    writeStoredSelections(recommendationKey, items);
  }, [recommendationKey]);

  const handleDeleteItem = (id: string) => {
    setSelectedItems((prev) => {
      const nextItems = prev.filter((item) => item.id !== id);
      writeStoredSelections(recommendationKey, nextItems);
      return nextItems;
    });
    setUncheckItemId(id);
  };

  const handleDeleteAll = () => {
    setSelectedItems([]);
    writeStoredSelections(recommendationKey, []);
    setClearSelectionSignal((prev) => prev + 1);
    setAppliedTemplateItems(null);
  };

  const handleApplyTemplate = (template: CartTemplate) => {
    setSelectedItems(template.items);
    setAppliedTemplateItems(template.items);
    writeStoredSelections(recommendationKey, template.items);
  };

  if (!isCartReady) {
    return null;
  }
  
  return (
    <>
      <DirectoryPageHeader
        variant="cart"
        diagnosisTitle={diagnosisTitle}
        recommendationId={recommendationId}
        recommendationSource={recommendationSource}
      />
      <main className={styles.page}>
      <section className={styles.layout}>
        <PrescriptionChecklist
          onSelectionChange={handleSelectionChange}
          uncheckItemId={uncheckItemId}
          onUncheckHandled={() => setUncheckItemId(null)}
          clearSelectionSignal={clearSelectionSignal}
          initialSections={checklistSections}
          appliedTemplateItems={appliedTemplateItems}
          appendixA3Tables={appendixA3Tables}
          isAppendixA3Loading={isAppendixA3Loading}
          appendixA3Error={appendixA3Error}
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
    </>
  );
}