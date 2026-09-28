"use client";

import { useLayoutEffect } from "react";

type RevealTarget = {
  selector: string;
  direction?: RevealDirection;
};

type RevealDirection = "left" | "right" | "up" | "down" | "scale";

type RevealGroup = {
  trigger: string;
  targets: RevealTarget[];
};

const revealGroups: RevealGroup[] = [
  {
    trigger: ".how-it-works-section",
    targets: [
      { selector: ":scope > h2" },
      { selector: ".how-it-works-card", direction: "scale" },
    ],
  },
  {
    trigger: ".video-showcase-section",
    targets: [
      { selector: ".video-showcase-player", direction: "scale" },
      { selector: ".video-showcase-copy > *", direction: "right" },
    ],
  },
  {
    trigger: ".capabilities-section",
    targets: [
      { selector: ":scope > h2" },
      { selector: ".capability-card", direction: "scale" },
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

const heroTargets: RevealTarget[] = [
  { selector: ".hero-eyebrow", direction: "left" },
  { selector: ".hero-title", direction: "left" },
  { selector: ".hero-section .lead-text", direction: "left" },
  { selector: ".hero-buttons", direction: "left" },
  { selector: ".hero-benefits", direction: "up" },
  { selector: ".hero-trust", direction: "up" },
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
      direction: RevealDirection = "up",
    ) => {
      element.dataset.scrollReveal = direction;
      element.style.setProperty("--reveal-delay", `${index * 140}ms`);
    };

    const header = document.querySelector<HTMLElement>(".header-section");
    if (header) prepare(header, 0, "down");

    heroTargets.forEach(({ selector, direction }, index) => {
      const element = main.querySelector<HTMLElement>(selector);
      if (element) prepare(element, index + 1, direction);
    });

    // The illustration enters at the same time as the staggered hero copy.
    const heroImage = main.querySelector<HTMLElement>(".hero-img");
    if (heroImage) prepare(heroImage, 1, "right");

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

    // Commit the hidden state before revealing the first screen. Without this
    // layout read, the browser can apply both states in the same frame and
    // skip the transition entirely during hydration.
    void main.offsetHeight;
    const heroFrame = requestAnimationFrame(() => {
      header?.classList.add("is-revealed");
      heroTargets.forEach(({ selector }) => {
        main.querySelector<HTMLElement>(selector)?.classList.add("is-revealed");
      });
      heroImage?.classList.add("is-revealed");
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
      // Do not start as soon as the first pixel enters the viewport. Waiting
      // for a meaningful part of the section keeps the animation visible to
      // users who are actively scrolling towards it.
      { threshold: 0.15, rootMargin: "0px 0px -18%" },
    );

    groupedElements.forEach((_, container) => observer.observe(container));

    return () => {
      cancelAnimationFrame(heroFrame);
      observer.disconnect();
    };
  }, []);

  return null;
}