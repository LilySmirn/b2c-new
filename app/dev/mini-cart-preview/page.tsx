import { notFound } from "next/navigation";
import { MINI_CART_PREVIEW_ENABLED } from "@/app/modules/miniCart";
import MiniCartPreviewClient from "./MiniCartPreviewClient";

/**
 * Временный preview мини-корзинки.
 * Удалить после завершения интеграции.
 */
export default function MiniCartPreviewPage() {
  if (!MINI_CART_PREVIEW_ENABLED) notFound();
  return <MiniCartPreviewClient />;
}
