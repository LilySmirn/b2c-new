"use client";

import { useState } from "react";
import PrescriptionChecklist from "../components/PrescriptionChecklist";
import type { SelectedPrescription } from "../components/PrescriptionChecklist";
import SideCart from "../components/SideCart";
import styles from "./cart.module.css";
import DirectoryPageHeader from "../components/DirectoryPageHeader";

export default function CartPreviewPage() {
  const [selectedItems, setSelectedItems] = useState<SelectedPrescription[]>([]);
  const [uncheckItemId, setUncheckItemId] = useState<string | null>(null);

  const handleDeleteItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
    setUncheckItemId(id);
  };

  return (
    <>
      <DirectoryPageHeader variant="cart" />
      <main className={styles.page}>
      <section className={styles.layout}>
        <PrescriptionChecklist
          onSelectionChange={setSelectedItems}
          uncheckItemId={uncheckItemId}
          onUncheckHandled={() => setUncheckItemId(null)}
        />
        <SideCart selectedItems={selectedItems} onDeleteItem={handleDeleteItem} />
      </section>
      </main>
    </>
  );
}