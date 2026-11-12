/**
 * Единый feature flag будущего включения мини-корзинки.
 * Preview и host должны опираться на эту константу.
 */
export const MINI_CART_ENABLED =
  process.env.NEXT_PUBLIC_MINI_CART === "1";

export const MINI_CART_PREVIEW_ENABLED =
  MINI_CART_ENABLED && process.env.NODE_ENV !== "production";
