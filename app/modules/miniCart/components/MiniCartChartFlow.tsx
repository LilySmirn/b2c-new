"use client";

import { useEffect } from "react";
import CorporateContactPopup from "@/app/components/CorporateContactPopup";
import MisIntegrationModal from "@/app/(directory)/components/MisIntegrationModal";
import { useMiniCartPortal } from "../context/MiniCartPortalContext";
import MiniCartPortal from "./MiniCartPortal";
import "../styles/miniCartMisModal.css";

export type MiniCartChartStep = "prompt" | "contact";

export type MiniCartChartBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: string;
};

type MiniCartChartFlowProps = {
  step: MiniCartChartStep;
  box: MiniCartChartBox | null;
  onClose: () => void;
  onContact: () => void;
};

/**
 * Сценарий «Запись в карту» внутри мини-корзинки:
 * информационное окно МИС, затем существующая форма заявки.
 * Оба шага монтируются в portalRoot (PiP или fallback-панель).
 */
export default function MiniCartChartFlow({
  step,
  box,
  onClose,
  onContact,
}: MiniCartChartFlowProps) {
  const { ownerDocument } = useMiniCartPortal();

  useEffect(() => {
    if (step !== "prompt") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const view = ownerDocument.defaultView;
    view?.addEventListener("keydown", handleKeyDown);
    return () => {
      try {
        view?.removeEventListener("keydown", handleKeyDown);
      } catch {
        /* PiP window may already be closing */
      }
    };
  }, [onClose, ownerDocument, step]);

  return (
    <MiniCartPortal>
      <div
        className={`preparaty__mis-layer${step === "contact" ? " is-contact" : ""}`}
        style={
          box
            ? {
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
                right: "auto",
                bottom: "auto",
                borderRadius: box.borderRadius,
              }
            : undefined
        }
        role="presentation"
        onClick={step === "prompt" ? onClose : undefined}
      >
        {step === "prompt" ? (
          <MisIntegrationModal compact onClose={onClose} onContact={onContact} />
        ) : (
          <CorporateContactPopup
            onClose={onClose}
            ownerDocument={ownerDocument}
            redirectOnError={false}
            containError
          />
        )}
      </div>
    </MiniCartPortal>
  );
}
