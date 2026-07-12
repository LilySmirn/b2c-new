export type DocumentFormat = "docx" | "pdf";

export type DocumentJobStatus =
  | "queued"
  | "processing"
  | "ready"
  | "error"
  | "consumed"
  | "expired";

export type DocumentGenerationPayload = {
  selectedItems: unknown[];
  customItems: unknown[];
  generalComment: string;
};

export type DocumentTemplate = {
  id: string;
  title: string;
  formats: DocumentFormat[];
  enabled: boolean;
};

export type DocumentGenerationInitRequest = {
  templateId: DocumentTemplate["id"];
  format: DocumentFormat;
  payload: DocumentGenerationPayload;
};

export type DocumentGenerationInitResponse = {
  jobId: string;
  status: Extract<DocumentJobStatus, "queued">;
  pollAfterMs: number;
  pollIntervalMs: number;
};

export type DocumentGenerationProcessingStatusResponse = {
  jobId: string;
  status: Extract<DocumentJobStatus, "queued" | "processing">;
  stage?: string;
};

export type DocumentGenerationReadyStatusResponse = {
  jobId: string;
  status: Extract<DocumentJobStatus, "ready">;
  format: DocumentFormat;
  fileUrl: string;
};

export type DocumentGenerationErrorStatusResponse = {
  jobId: string;
  status: Extract<DocumentJobStatus, "error" | "expired">;
  error: string;
};

export type DocumentGenerationConsumedStatusResponse = {
  jobId: string;
  status: Extract<DocumentJobStatus, "consumed">;
};

export type DocumentGenerationStatusResponse =
  | DocumentGenerationProcessingStatusResponse
  | DocumentGenerationReadyStatusResponse
  | DocumentGenerationErrorStatusResponse
  | DocumentGenerationConsumedStatusResponse;

export type DocumentJob = {
  id: string;
  templateId: DocumentTemplate["id"];
  format: DocumentFormat;
  status: DocumentJobStatus;
  payload: DocumentGenerationPayload;
  filePath?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};