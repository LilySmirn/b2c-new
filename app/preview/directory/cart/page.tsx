"use client";

import { useEffect, useState } from "react";
import PrescriptionChecklist from "../components/PrescriptionChecklist";
import type { ChecklistSection, SelectedPrescription } from "../components/PrescriptionChecklist";
import SideCart from "../components/SideCart";
import styles from "./cart.module.css";
import DirectoryPageHeader from "@/app/preview/directory/components/DirectoryPageHeader";

type StoredCartRecommendation = {
  diagnosisTitle?: string;
  recommendation?: {
    prescriptions?: ChecklistSection[];
  };
};

const CART_RECOMMENDATION_STORAGE_KEY = "directoryCartRecommendation";

export default function CartPreviewPage() {
  const [selectedItems, setSelectedItems] = useState<SelectedPrescription[]>([]);
  const [uncheckItemId, setUncheckItemId] = useState<string | null>(null);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const [diagnosisTitle, setDiagnosisTitle] = useState("");
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>([]);

  useEffect(() => {
    const storedValue = window.sessionStorage.getItem(CART_RECOMMENDATION_STORAGE_KEY);
    if (!storedValue) return;

    try {
      const parsed = JSON.parse(storedValue) as StoredCartRecommendation;
      setDiagnosisTitle(parsed.diagnosisTitle ?? "");
      setChecklistSections(parsed.recommendation?.prescriptions ?? []);
    } catch {
      setDiagnosisTitle("");
      setChecklistSections([]);
    }
  }, []);

  const handleDeleteItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
    setUncheckItemId(id);
  };

  const handleDeleteAll = () => {
    setSelectedItems([]);
    setClearSelectionSignal((prev) => prev + 1);
  };

  return (
    <>
      <DirectoryPageHeader variant="cart" diagnosisTitle={diagnosisTitle} />
      <main className={styles.page}>
      <section className={styles.layout}>
        <PrescriptionChecklist
          onSelectionChange={setSelectedItems}
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