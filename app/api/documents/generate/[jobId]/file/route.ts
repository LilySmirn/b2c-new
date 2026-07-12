import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  consumeDocumentGenerationJob,
  deleteConsumedDocxFile,
} from "../../../../../lib/documentGeneration/service";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

const contentTypes = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
} as const;

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = await consumeDocumentGenerationJob(jobId);

  if (!job || !job.filePath) {
    return NextResponse.json({ error: "Документ не найден или еще не готов." }, { status: 404 });
  }

  try {
    const file = await readFile(job.filePath);
    const dispositionType = job.format === "pdf" ? "inline" : "attachment";
    const fileName = `document-${job.id}.${job.format}`;

    if (job.format === "docx") {
      void deleteConsumedDocxFile(job);
    }

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypes[job.format],
        "Content-Disposition": `${dispositionType}; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Не удалось получить файл документа." }, { status: 500 });
  }
}