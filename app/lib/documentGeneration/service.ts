import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type {
  DocumentGenerationInitRequest,
  DocumentGenerationInitResponse,
  DocumentGenerationStatusResponse,
  DocumentJob,
} from "@/app/types/DocumentGeneration";
import { DOCUMENT_GENERATION_CONFIG } from "@/app/directory/components/documentGenerationConfig";
import { documentTemplates } from "@/app/directory/components/documentTemplates";
import { DOCUMENT_GENERATION_SERVER_CONFIG } from "./config";
import { generateMockDocumentFile } from "./generator";
import { documentJobStore } from "./store";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const deleteFile = async (filePath: string | undefined) => {
  if (!filePath) return;
  await rm(filePath, { force: true });
};

export const validateDocumentGenerationRequest = (body: unknown): DocumentGenerationInitRequest => {
  if (!isRecord(body)) {
    throw new Error("Некорректный запрос на формирование документа.");
  }

  const templateId = typeof body.templateId === "string" ? body.templateId : "";
  const format = body.format === "docx" || body.format === "pdf" ? body.format : null;
  const payload = isRecord(body.payload) ? body.payload : null;
  const template = documentTemplates.find((item) => item.id === templateId);

  if (!template || !template.enabled) {
    throw new Error("Выбранный шаблон документа недоступен.");
  }

  if (!format || !template.formats.includes(format)) {
    throw new Error("Выбранный формат документа недоступен для шаблона.");
  }

  if (!payload) {
    throw new Error("Не переданы данные для формирования документа.");
  }

  return {
    templateId,
    format,
    payload: {
      selectedItems: Array.isArray(payload.selectedItems) ? payload.selectedItems : [],
      customItems: Array.isArray(payload.customItems) ? payload.customItems : [],
      generalComment: typeof payload.generalComment === "string" ? payload.generalComment : "",
    },
  };
};

export const cleanupExpiredDocumentJobs = async () => {
  const now = Date.now();
  const jobs = await documentJobStore.listJobs();

  await Promise.all(
    jobs.map(async (job) => {
      if (job.expiresAt.getTime() > now) return;

      await deleteFile(job.filePath);
      await documentJobStore.deleteJob(job.id);
    }),
  );
};

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, delayMs);
    timeout.unref?.();
  });

const completeMockGeneration = async (jobId: string) => {
  const queuedJob = await documentJobStore.getJob(jobId);
  if (!queuedJob || queuedJob.status !== "queued") return;

  await documentJobStore.updateJob(jobId, { status: "processing" });
  await wait(DOCUMENT_GENERATION_SERVER_CONFIG.mockGenerationDelayMs);

  const job = await documentJobStore.getJob(jobId);
  if (!job || job.status !== "processing") return;

  try {
    const filePath = await generateMockDocumentFile({
      jobId: job.id,
      format: job.format,
      payload: job.payload,
    });

    await documentJobStore.updateJob(jobId, {
      status: "ready",
      filePath,
    });
  } catch {
    await documentJobStore.updateJob(jobId, {
      status: "error",
      errorMessage: "Не удалось сформировать документ.",
    });
  }
};

export const createDocumentGenerationJob = async (
  request: DocumentGenerationInitRequest,
): Promise<DocumentGenerationInitResponse> => {
  await cleanupExpiredDocumentJobs();

  const now = new Date();
  const job: DocumentJob = {
    id: randomUUID(),
    templateId: request.templateId,
    format: request.format,
    status: "queued",
    payload: request.payload,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + DOCUMENT_GENERATION_SERVER_CONFIG.jobTtlMs),
  };

  await documentJobStore.createJob(job);

  void completeMockGeneration(job.id);

  return {
    jobId: job.id,
    status: "queued",
    pollAfterMs: DOCUMENT_GENERATION_CONFIG.initialPollDelayMs,
    pollIntervalMs: DOCUMENT_GENERATION_CONFIG.pollIntervalMs,
  };
};

export const getDocumentGenerationStatus = async (
  jobId: string,
): Promise<DocumentGenerationStatusResponse | null> => {
  await cleanupExpiredDocumentJobs();

  const job = await documentJobStore.getJob(jobId);
  if (!job) return null;

  if (job.status === "ready") {
    return {
      jobId: job.id,
      status: "ready",
      format: job.format,
      fileUrl: `/api/documents/generate/${job.id}/file`,
    };
  }

  if (job.status === "error" || job.status === "expired") {
    return {
      jobId: job.id,
      status: job.status,
      error: job.errorMessage ?? "Не удалось сформировать документ.",
    };
  }

  if (job.status === "consumed") {
    return {
      jobId: job.id,
      status: "consumed",
    };
  }

  return {
    jobId: job.id,
    status: job.status,
    stage: job.status === "queued" ? "Запрос ожидает обработки" : "Генерация документа",
  };
};

export const consumeDocumentGenerationJob = async (jobId: string) => {
  await cleanupExpiredDocumentJobs();

  const job = await documentJobStore.getJob(jobId);
  if (!job || job.status !== "ready" || !job.filePath) return null;

  await documentJobStore.updateJob(jobId, { status: "consumed" });

  return job;
};

export const deleteConsumedDocxFile = async (job: DocumentJob) => {
  if (job.format !== "docx") return;

  await deleteFile(job.filePath);
  await documentJobStore.deleteJob(job.id);
};