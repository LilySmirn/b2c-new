import { NextResponse } from "next/server";
import {
  createDocumentGenerationJob,
  validateDocumentGenerationRequest,
} from "@/app/lib/documentGeneration/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const generationRequest = validateDocumentGenerationRequest(body);
    const response = await createDocumentGenerationJob(generationRequest);

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось создать задачу формирования документа.",
      },
      { status: 400 },
    );
  }
}