import { NextResponse } from "next/server";
import { getDocumentGenerationStatus } from "@/app/lib/documentGeneration/service";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const status = await getDocumentGenerationStatus(jobId);

  if (!status) {
    return NextResponse.json({ error: "Задача формирования документа не найдена." }, { status: 404 });
  }

  return NextResponse.json(status);
}