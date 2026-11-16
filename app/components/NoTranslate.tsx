import type { HTMLAttributes, ReactNode } from "react";

type NoTranslateProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

/**
 * Marks text that must stay intact under browser auto-translate
 * (codes, brands, units, single-letter UI icons).
 *
 * Also reduces Chrome Translate + React clashes: the translator injects
 * <font> wrappers into translated text nodes, which can break updates.
 * Keeping volatile tokens (icons, codes, doses) outside translation avoids
 * those DOM mutations on the hottest interactive surfaces.
 */
export default function NoTranslate({
  children,
  className,
  ...rest
}: NoTranslateProps) {
  return (
    <span
      {...rest}
      translate="no"
      className={className ? `notranslate ${className}` : "notranslate"}
    >
      {children}
    </span>
  );
}

/** Merge `notranslate` into an existing className for host elements. */
export function withNoTranslateClass(className?: string): string {
  return className ? `notranslate ${className}` : "notranslate";
}
