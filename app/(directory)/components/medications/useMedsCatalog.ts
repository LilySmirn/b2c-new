"use client";

import { useEffect, useMemo, useState } from "react";
import { readMedsCatalog, resolveMeds } from "./medsClient";
import type { MedsCatalogResponse } from "./medsCatalogTypes";

const namesFromKey = (namesKey: string) => (namesKey ? namesKey.split("\u0000") : []);

/**
 * Загружает справочник для текущих названий назначений.
 * Пока `resolveMeds` читает JSON, список доступен на первом рендере.
 * Ответ сети, когда он появится, заменяет этот снимок, не очищая черновики строк.
 */
export function useMedsCatalog(namesKey: string) {
  const synced = useMemo(() => readMedsCatalog(namesFromKey(namesKey)), [namesKey]);
  const [remote, setRemote] = useState<MedsCatalogResponse | null>(null);
  const [remoteKey, setRemoteKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    resolveMeds(namesFromKey(namesKey)).then(
      (catalog) => {
        if (!active) return;

        setRemote(catalog);
        setRemoteKey(namesKey);
      },
      () => {
        if (!active) return;

        setRemote(null);
        setRemoteKey(null);
      },
    );

    return () => {
      active = false;
    };
  }, [namesKey]);

  return remoteKey === namesKey && remote ? remote : synced;
}
