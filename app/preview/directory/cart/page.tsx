"use client";

import { useCallback, useEffect, useState } from "react";
import PrescriptionChecklist from "../components/PrescriptionChecklist";
import type { ChecklistSection, SelectedPrescription } from "../components/PrescriptionChecklist";
import SideCart from "../components/SideCart";
import styles from "./cart.module.css";
import DirectoryPageHeader from "@/app/preview/directory/components/DirectoryPageHeader";

type StoredCartRecommendation = {
  diagnosisTitle?: string;
  recommendationKey?: string;
  recommendation?: {
    id?: string;
    title?: string;
    mkbCodes?: string[];
    prescriptions?: ChecklistSection[];
  };
};

type StoredCartSelections = Record<string, string[]>;

const CART_RECOMMENDATION_STORAGE_KEY = "directoryCartRecommendation";
const CART_SELECTIONS_STORAGE_KEY = "directoryCartSelections";

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
  const storedValue = window.sessionStorage.getItem(CART_SELECTIONS_STORAGE_KEY);
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

const writeStoredSelectionIds = (recommendationKey: string, selectedIds: string[]) => {
  if (!recommendationKey) return;

  const storedSelections = readStoredSelections();

  if (selectedIds.length > 0) {
    storedSelections[recommendationKey] = selectedIds;
  } else {
    delete storedSelections[recommendationKey];
  }

  window.sessionStorage.setItem(
    CART_SELECTIONS_STORAGE_KEY,
    JSON.stringify(storedSelections),
  );
};

const applyStoredSelections = (
  sections: ChecklistSection[],
  selectedIds: string[],
) => {
  const selectedIdSet = new Set(selectedIds);

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      checked: selectedIdSet.has(item.id),
    })),
  }));
};

export default function CartPreviewPage() {
  const [selectedItems, setSelectedItems] = useState<SelectedPrescription[]>([]);
  const [uncheckItemId, setUncheckItemId] = useState<string | null>(null);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const [diagnosisTitle, setDiagnosisTitle] = useState("");
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>([]);
  const [recommendationKey, setRecommendationKey] = useState("");

  useEffect(() => {
    const storedValue = window.sessionStorage.getItem(CART_RECOMMENDATION_STORAGE_KEY);
    if (!storedValue) return;

    try {
      const parsed = JSON.parse(storedValue) as StoredCartRecommendation;
      const currentRecommendationKey = getRecommendationStorageKey(parsed);
      const storedSelectedIds = readStoredSelections()[currentRecommendationKey] ?? [];

      setDiagnosisTitle(parsed.diagnosisTitle ?? "");
      setRecommendationKey(currentRecommendationKey);
      setChecklistSections(
        applyStoredSelections(
          parsed.recommendation?.prescriptions ?? [],
          storedSelectedIds,
        ),
      );
    } catch {
      setDiagnosisTitle("");
      setChecklistSections([]);
      setRecommendationKey("");
    }
  }, []);

  const handleSelectionChange = useCallback((items: SelectedPrescription[]) => {
    setSelectedItems(items);
    writeStoredSelectionIds(
      recommendationKey,
      items.map((item) => item.id),
    );
  }, [recommendationKey]);

  const handleDeleteItem = (id: string) => {
    setSelectedItems((prev) => {
      const nextItems = prev.filter((item) => item.id !== id);
      writeStoredSelectionIds(
        recommendationKey,
        nextItems.map((item) => item.id),
      );
      return nextItems;
    });
    setUncheckItemId(id);
  };

  const handleDeleteAll = () => {
    setSelectedItems([]);
    writeStoredSelectionIds(recommendationKey, []);
    setClearSelectionSignal((prev) => prev + 1);
  };

  return (
    <>
      <DirectoryPageHeader variant="cart" diagnosisTitle={diagnosisTitle} />
      <main className={styles.page}>
      <section className={styles.layout}>
        <PrescriptionChecklist
          onSelectionChange={handleSelectionChange}
          uncheckItemId={uncheckItemId}
          onUncheckHandled={() => setUncheckItemId(null)}
          clearSelectionSignal={clearSelectionSignal}
          initialSections={checklistSections}
        />
        <SideCart
          selectedItems={selectedItems}
          onDeleteItem={handleDeleteItem}
          onDeleteAll={handleDeleteAll}
        />
      </section>
      </main>
    </>
  );
}