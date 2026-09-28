"use client";

import { useLayoutEffect } from "react";

type RevealTarget = {
  selector: string;
  direction?: "left" | "right" | "up";
};

type RevealGroup = {
  trigger: string;
  targets: RevealTarget[];
};

const revealGroups: RevealGroup[] = [
  {
    trigger: ".how-it-works-section",
    targets: [
      { selector: ":scope > h2" },
      { selector: ".how-it-works-step" },
    ],
  },
  {
    trigger: ".video-showcase-section",
    targets: [
      { selector: ".video-showcase-player", direction: "left" },
      { selector: ".video-showcase-copy", direction: "right" },
    ],
  },
  {
    trigger: ".capabilities-section",
    targets: [
      { selector: ":scope > h2" },
      { selector: ".capability-card" },
    ],
  },
  { trigger: ".product-stats-section", targets: [{ selector: ".product-stat" }] },
  {
    trigger: ".reviews-section",
    targets: [
      { selector: ".reviews-container > h2" },
      { selector: ".reviews-carousel" },
      { selector: ".reviews-pagination" },
    ],
  },
  {
    trigger: ".pricing-section",
    targets: [
      { selector: ".pricing-container > h2" },
      { selector: ".pricing-card-link" },
    ],
  },
  {
    trigger: ".corporate-access-section",
    targets: [
      { selector: ".corporate-access-container > h2", direction: "left" },
      { selector: ".corporate-access-container > .contact-button", direction: "right" },
    ],
  },
  {
    trigger: ".faq-section",
    targets: [
      { selector: ".faq-container > .title" },
      { selector: ".faq-item" },
    ],
  },
  {
    trigger: ".cta-section",
    targets: [
      { selector: ".cta-copy", direction: "left" },
      { selector: ".cta-action" },
      { selector: ".cta-image", direction: "right" },
    ],
  },
];

const heroSelectors = [
  ".hero-eyebrow",
  ".hero-title",
  ".hero-section .lead-text",
  ".hero-buttons",
  ".hero-benefits",
  ".hero-trust",
  ".hero-img",
];

export default function HomeScrollAnimations() {
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>(".main");
    if (!main) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const groupedElements = new Map<HTMLElement, HTMLElement[]>();

    const prepare = (
      element: HTMLElement,
      index = 0,
      direction: RevealTarget["direction"] = "up",
    ) => {
      element.dataset.scrollReveal = direction;
      element.style.setProperty("--reveal-delay", `${Math.min(index * 90, 360)}ms`);
    };

    heroSelectors.forEach((selector, index) => {
      const element = main.querySelector<HTMLElement>(selector);
      if (element) prepare(element, index);
    });

    revealGroups.forEach(({ trigger, targets }) => {
      main.querySelectorAll<HTMLElement>(trigger).forEach((container) => {
        const elements: HTMLElement[] = [];

        targets.forEach(({ selector, direction }) => {
          container.querySelectorAll<HTMLElement>(selector).forEach((element) => {
            prepare(element, elements.length, direction);
            elements.push(element);
          });
        });

        if (elements.length) groupedElements.set(container, elements);
      });
    });

    // Start the first screen as a calm, sequential composition instead of
    // waiting for IntersectionObserver to run its first callback.
    requestAnimationFrame(() => {
      heroSelectors.forEach((selector) => {
        main.querySelector<HTMLElement>(selector)?.classList.add("is-revealed");
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          groupedElements.get(entry.target as HTMLElement)?.forEach((element) => {
            element.classList.add("is-revealed");
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -12%" },
    );

    groupedElements.forEach((_, container) => observer.observe(container));

    return () => observer.disconnect();
  }, []);

  return null;
}