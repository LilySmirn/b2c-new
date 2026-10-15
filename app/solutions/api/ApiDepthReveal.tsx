"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ApiDepthRevealProps = {
  className?: string;
  children: ReactNode;
};

// Wait until the scroll-reveal WAAPI on the outer wrapper has made the scheme
// visible before starting SVG line draw / pulse CSS (which keys off data-visible).
// Matches HomeScrollAnimations observer + a portion of the 1150 ms reveal.
const VISIBILITY_DELAY_MS = 520;

export default function ApiDepthReveal({
  className,
  children,
}: ApiDepthRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    let delayId = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        delayId = window.setTimeout(() => {
          setVisible(true);
        }, VISIBILITY_DELAY_MS);
        observer.disconnect();
      },
      // Same trigger window as ApiScrollAnimations / HomeScrollAnimations.
      { threshold: 0.15, rootMargin: "0px 0px -18%" },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(delayId);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      data-visible={visible ? "true" : undefined}
    >
      {children}
    </div>
  );
}
