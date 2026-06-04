"use client";

import { useState } from "react";
import PrescriptionChecklist from "../components/PrescriptionChecklist";
import type { SelectedPrescription } from "../components/PrescriptionChecklist";
import SideCart from "../components/SideCart";
import styles from "./cart.module.css";
import DirectoryPageHeader from "@/app/preview/directory/components/DirectoryPageHeader";

const EXAMPLE_DIAGNOSIS_TITLE =
  "К26.5 Смешанные и другие расстройства личности и поведения, обусловленные повреждением и дисфункцией головного мозга";

export default function CartPreviewPage() {
  const [selectedItems, setSelectedItems] = useState<SelectedPrescription[]>([]);
  const [uncheckItemId, setUncheckItemId] = useState<string | null>(null);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);

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
      <DirectoryPageHeader variant="cart" diagnosisTitle={EXAMPLE_DIAGNOSIS_TITLE} />
      <main className={styles.page}>
      <section className={styles.layout}>
        <PrescriptionChecklist
          onSelectionChange={setSelectedItems}
          uncheckItemId={uncheckItemId}
          onUncheckHandled={() => setUncheckItemId(null)}
          clearSelectionSignal={clearSelectionSignal}
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