import type { DocumentJob } from "@/app/types/DocumentGeneration";

export interface DocumentJobStore {
  createJob(job: DocumentJob): Promise<void>;
  getJob(id: string): Promise<DocumentJob | null>;
  updateJob(id: string, patch: Partial<DocumentJob>): Promise<void>;
  deleteJob(id: string): Promise<void>;
  listJobs(): Promise<DocumentJob[]>;
}

export class MemoryDocumentJobStore implements DocumentJobStore {
  private readonly jobs = new Map<string, DocumentJob>();

  async createJob(job: DocumentJob) {
    this.jobs.set(job.id, job);
  }

  async getJob(id: string) {
    return this.jobs.get(id) ?? null;
  }

  async updateJob(id: string, patch: Partial<DocumentJob>) {
    const job = this.jobs.get(id);
    if (!job) return;

    this.jobs.set(id, {
      ...job,
      ...patch,
      updatedAt: new Date(),
    });
  }

  async deleteJob(id: string) {
    this.jobs.delete(id);
  }

  async listJobs() {
    return Array.from(this.jobs.values());
  }
}

type DocumentGenerationGlobal = typeof globalThis & {
  documentJobStore?: MemoryDocumentJobStore;
};

const globalForDocumentGeneration = globalThis as DocumentGenerationGlobal;

export const documentJobStore =
  globalForDocumentGeneration.documentJobStore ?? new MemoryDocumentJobStore();

globalForDocumentGeneration.documentJobStore = documentJobStore;