import type { DocumentTemplate } from "@/app/types/DocumentGeneration";

export const documentTemplates: DocumentTemplate[] = [
  {
    id: "default-recommendations",
    title: "Рекомендации пациенту",
    formats: ["docx", "pdf"],
    enabled: true,
  },
  {
    id: "doctor-summary",
    title: "Выписка для врача",
    formats: ["docx", "pdf"],
    enabled: false,
  },
];