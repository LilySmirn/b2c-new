"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ApiDepthRevealProps = {
  className?: string;
  children: ReactNode;
};

export default function ApiDepthReveal({
  className,
  children,
}: ApiDepthRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
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
