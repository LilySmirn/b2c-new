"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DocumentFormat,
  DocumentGenerationInitRequest,
  DocumentGenerationInitResponse,
  DocumentGenerationPayload,
  DocumentGenerationReadyStatusResponse,
  DocumentGenerationStatusResponse,
  DocumentTemplate,
} from "@/app/types/DocumentGeneration";
import { DOCUMENT_GENERATION_CONFIG } from "./documentGenerationConfig";

type DocumentGenerationUiStatus =
  | "idle"
  | "init"
  | "processing"
  | "ready"
  | "error"
  | "timeout";

type StartDocumentGenerationParams = {
  template: DocumentTemplate;
  format: DocumentFormat;
  payload: DocumentGenerationPayload;
};

type DocumentGenerationState = {
  status: DocumentGenerationUiStatus;
  jobId: string | null;
  stage: string | null;
  error: string | null;
  readyDocument: DocumentGenerationReadyStatusResponse | null;
  pdfUrlToOpen: string | null;
};

const initialState: DocumentGenerationState = {
  status: "idle",
  jobId: null,
  stage: null,
  error: null,
  readyDocument: null,
  pdfUrlToOpen: null,
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const assertOkResponse = async (response: Response, fallbackMessage: string) => {
  if (response.ok) return;

  let serverMessage: string | undefined;

  try {
    const body = (await response.json()) as { error?: string; message?: string };
    serverMessage = body.error ?? body.message;
  } catch {
    // Response body is not guaranteed to be JSON.
  }

  throw new Error(serverMessage ?? fallbackMessage);
};

const downloadDocument = (fileUrl: string) => {
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const useDocumentGeneration = () => {
  const [state, setState] = useState<DocumentGenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<number | null>(null);
  const pollingTimeoutIdRef = useRef<number | null>(null);
  const generationStartedAtRef = useRef<number>(0);
  const pdfWindowRef = useRef<Window | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    if (pollingTimeoutIdRef.current) {
      window.clearTimeout(pollingTimeoutIdRef.current);
      pollingTimeoutIdRef.current = null;
    }
  }, []);

  const resetPdfWindow = useCallback(() => {
    pdfWindowRef.current = null;
  }, []);

  const abort = useCallback(() => {
    clearTimers();
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    resetPdfWindow();
    setState(initialState);
  }, [clearTimers, resetPdfWindow]);

  const handleReadyDocument = useCallback(
    (readyDocument: DocumentGenerationReadyStatusResponse) => {
      clearTimers();

      const pdfWindow = pdfWindowRef.current;
      const shouldShowOpenPdfButton = readyDocument.format === "pdf" && !pdfWindow;

      if (readyDocument.format === "docx") {
        downloadDocument(readyDocument.fileUrl);
      } else if (pdfWindow) {
        pdfWindow.location.href = readyDocument.fileUrl;
        resetPdfWindow();
      }

      setState((currentState) => ({
        ...currentState,
        status: "ready",
        stage: null,
        error: null,
        readyDocument,
        pdfUrlToOpen: shouldShowOpenPdfButton ? readyDocument.fileUrl : null,
      }));
    },
    [clearTimers, resetPdfWindow],
  );

  const pollStatus = useCallback(
    async (jobId: string, pollIntervalMs: number, signal: AbortSignal) => {
      if (Date.now() - generationStartedAtRef.current >= DOCUMENT_GENERATION_CONFIG.maxPollingDurationMs) {
        clearTimers();
        setState((currentState) => ({
          ...currentState,
          status: "timeout",
          error: "Превышено время ожидания формирования документа.",
        }));
        return;
      }

      try {
        const response = await fetch(`/api/documents/generate/${jobId}/status`, { signal });
        await assertOkResponse(response, "Не удалось получить статус формирования документа.");

        const statusResponse = (await response.json()) as DocumentGenerationStatusResponse;

        if (statusResponse.status === "ready") {
          handleReadyDocument(statusResponse);
          return;
        }

        if (statusResponse.status === "error" || statusResponse.status === "expired") {
          clearTimers();
          setState((currentState) => ({
            ...currentState,
            status: statusResponse.status === "expired" ? "timeout" : "error",
            stage: null,
            error: statusResponse.error,
          }));
          return;
        }

        if (statusResponse.status === "consumed") {
          clearTimers();
          setState((currentState) => ({
            ...currentState,
            status: "error",
            stage: null,
            error: "Документ уже был получен.",
          }));
          return;
        }

        setState((currentState) => ({
          ...currentState,
          status: "processing",
          stage: "stage" in statusResponse ? statusResponse.stage ?? "Генерация документа" : "Генерация документа",
        }));

        pollingTimeoutIdRef.current = window.setTimeout(() => {
          void pollStatus(jobId, pollIntervalMs, signal);
        }, pollIntervalMs);
      } catch (error) {
        if (isAbortError(error)) return;

        clearTimers();
        setState((currentState) => ({
          ...currentState,
          status: "error",
          stage: null,
          error: error instanceof Error ? error.message : "Не удалось сформировать документ.",
        }));
      }
    },
    [clearTimers, handleReadyDocument],
  );

  const startGeneration = useCallback(
    async ({ template, format, payload }: StartDocumentGenerationParams) => {
      clearTimers();
      abortControllerRef.current?.abort();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      generationStartedAtRef.current = Date.now();

      if (format === "pdf") {
        pdfWindowRef.current = window.open("", "_blank");
      } else {
        resetPdfWindow();
      }

      setState({
        ...initialState,
        status: "init",
      });

      try {
        const body: DocumentGenerationInitRequest = {
          templateId: template.id,
          format,
          payload,
        };
        const response = await fetch("/api/documents/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });
        await assertOkResponse(response, "Не удалось отправить запрос на формирование документа.");

        const initResponse = (await response.json()) as DocumentGenerationInitResponse;
        const pollAfterMs = initResponse.pollAfterMs ?? DOCUMENT_GENERATION_CONFIG.initialPollDelayMs;
        const pollIntervalMs = initResponse.pollIntervalMs ?? DOCUMENT_GENERATION_CONFIG.pollIntervalMs;

        setState((currentState) => ({
          ...currentState,
          status: "processing",
          jobId: initResponse.jobId,
          stage: "Запрос принят. Ожидаем формирования документа.",
        }));

        timeoutIdRef.current = window.setTimeout(() => {
          void pollStatus(initResponse.jobId, pollIntervalMs, abortController.signal);
        }, pollAfterMs);
      } catch (error) {
        if (isAbortError(error)) return;

        clearTimers();
        resetPdfWindow();
        setState({
          ...initialState,
          status: "error",
          error: error instanceof Error ? error.message : "Не удалось сформировать документ.",
        });
      }
    },
    [clearTimers, pollStatus, resetPdfWindow],
  );

  const openReadyPdf = useCallback(() => {
    if (!state.pdfUrlToOpen) return;
    window.open(state.pdfUrlToOpen, "_blank", "noopener,noreferrer");
  }, [state.pdfUrlToOpen]);

  useEffect(() => abort, [abort]);

  return {
    ...state,
    isActionInProgress: state.status === "init" || state.status === "processing",
    startGeneration,
    abort,
    openReadyPdf,
  };
};