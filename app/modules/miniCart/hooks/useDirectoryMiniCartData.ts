"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AppendixA3Table,
  ChecklistSection,
} from "@/app/(directory)/components/checklistModel";
import {
  EMPTY_ASSIGNMENT_SNAPSHOT,
  type ChecklistAssignmentSnapshot,
} from "@/app/(directory)/components/medications/assignmentSnapshot";
import { useMedsCatalog } from "@/app/(directory)/components/medications/useMedsCatalog";
import { EMPTY_MEDS_CATALOG } from "@/app/(directory)/components/medications/medsCatalogTypes";
import {
  cartStorage,
  subscribeCartSync,
  type StoredCustomCartItem,
} from "@/app/(directory)/shared/cart";
import {
  adaptDirectoryCartToMiniCart,
  type DirectoryMiniCartViewModel,
} from "../adapters/fromDirectoryCart";

export type UseDirectoryMiniCartDataArgs = {
  diagnosisTitle: string;
  sections: ChecklistSection[];
  recommendationKey: string;
  appendixA3Tables?: AppendixA3Table[];
  isAppendixA3Loading?: boolean;
  appendixA3Error?: string;
  assignment?: ChecklistAssignmentSnapshot;
};

export type DirectoryMiniCartData = DirectoryMiniCartViewModel & {
  medsStatus: "idle" | "loading" | "ready" | "error";
};

const readCartExtras = (recommendationKey: string) => {
  if (!recommendationKey) {
    return {
      customItems: [] as StoredCustomCartItem[],
      generalRecommendation: "",
    };
  }

  return {
    customItems: cartStorage.readCustomItems(recommendationKey),
    generalRecommendation: cartStorage.readGeneralComment(recommendationKey),
  };
};

/**
 * Читает уже загруженный medsCatalogSession, секции корзины и снимок назначений.
 * Не инициирует повторный fetch каталога.
 */
export function useDirectoryMiniCartData({
  diagnosisTitle,
  sections,
  recommendationKey,
  appendixA3Tables = [],
  isAppendixA3Loading = false,
  appendixA3Error = "",
  assignment = EMPTY_ASSIGNMENT_SNAPSHOT,
}: UseDirectoryMiniCartDataArgs): DirectoryMiniCartData {
  const meds = useMedsCatalog(recommendationKey);
  const [cartExtras, setCartExtras] = useState(() =>
    readCartExtras(recommendationKey),
  );

  useEffect(() => {
    setCartExtras(readCartExtras(recommendationKey));
  }, [recommendationKey]);

  useEffect(() => {
    if (!recommendationKey) return;

    return subscribeCartSync((message) => {
      if (message.origin === "local") {
        // SideCart пишет в storage до/вместе с publish — перечитываем extras.
        if (
          message.scopes.includes("customItems") ||
          message.scopes.includes("generalComments") ||
          message.scopes.includes("cleared")
        ) {
          setCartExtras(readCartExtras(recommendationKey));
        }
        return;
      }

      if (
        message.scopes.includes("customItems") ||
        message.scopes.includes("generalComments") ||
        message.scopes.includes("cleared")
      ) {
        setCartExtras(readCartExtras(recommendationKey));
      }
    });
  }, [recommendationKey]);

  const viewModel = useMemo(
    () =>
      adaptDirectoryCartToMiniCart({
        diagnosisTitle,
        sections,
        catalog:
          meds.status === "ready" ? meds.catalog : EMPTY_MEDS_CATALOG,
        catalogQuery: meds.status === "ready" ? meds.query : null,
        appendixA3Tables,
        isAppendixA3Loading,
        appendixA3Error,
        assignment,
        customItems: cartExtras.customItems,
        generalRecommendation: cartExtras.generalRecommendation,
      }),
    [
      appendixA3Error,
      appendixA3Tables,
      assignment,
      cartExtras.customItems,
      cartExtras.generalRecommendation,
      diagnosisTitle,
      isAppendixA3Loading,
      meds.catalog,
      meds.query,
      meds.status,
      sections,
    ],
  );

  return {
    ...viewModel,
    medsStatus: meds.status,
  };
}
