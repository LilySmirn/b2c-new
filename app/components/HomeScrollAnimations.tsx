"use client";

import { useLayoutEffect } from "react";

type RevealDirection = "left" | "right" | "up" | "down" | "scale";

type RevealTarget = {
  selector: string;
  direction?: RevealDirection;
};

type RevealGroup = {
  trigger: string;
  targets: RevealTarget[];
};

const STAGGER_MS = 140;

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

const revealTransform: Record<RevealDirection, string> = {
  left: "translate3d(-38px, 0, 0)",
  right: "translate3d(38px, 0, 0)",
  up: "translate3d(0, 34px, 0)",
  down: "translate3d(0, -34px, 0)",
  scale: "scale(0.62)",
};

function createRevealAnimation(
  element: HTMLElement,
  direction: RevealDirection = "up",
  delay = 0,
) {
  // Some animated nodes already use transform for layout. In particular, the
  // fixed header is centred with translateX(-50%). Replacing that transform
  // during the reveal makes it start in the middle and slide sideways. Keep
  // the computed layout transform in both keyframes and only add the reveal
  // movement in front of it.
  const layoutTransform = getComputedStyle(element).transform;
  const finalTransform = layoutTransform === "none" ? "none" : layoutTransform;
  const initialRevealTransform = finalTransform === "none"
    ? revealTransform[direction]
    : `${revealTransform[direction]} ${finalTransform}`;

  const animation = element.animate(
    [
      { opacity: 0, transform: initialRevealTransform },
      { opacity: 1, transform: finalTransform },
    ],
    {
      duration: direction === "scale" ? 1100 : 1000,
      delay,
      easing: direction === "scale"
        ? "cubic-bezier(0.16, 1, 0.3, 1)"
        : "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    },
  );

  // Creating every animation in a paused state during the layout effect puts
  // its first frame on screen before the browser can paint hydrated content.
  animation.pause();
  // Drop the finished effect so card hover transforms are not overridden by
  // a forwards-filled Web Animation. The regular stylesheet is the end state.
  animation.onfinish = () => animation.cancel();
  return animation;
}

export default function HomeScrollAnimations() {
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>(".main");
    if (!main || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animations: Animation[] = [];
    const groupedAnimations = new Map<HTMLElement, Animation[]>();

    const prepare = (
      element: HTMLElement,
      index = 0,
      direction: RevealDirection = "up",
    ) => {
      const animation = createRevealAnimation(element, direction, index * STAGGER_MS);
      animations.push(animation);
      return animation;
    };

    const heroAnimations: Animation[] = [];
    const header = document.querySelector<HTMLElement>(".header-section");
    if (header) heroAnimations.push(prepare(header, 0, "down"));

    heroTargets.forEach(({ selector, direction }, index) => {
      const element = main.querySelector<HTMLElement>(selector);
      if (element) heroAnimations.push(prepare(element, index + 1, direction));
    });

    // The main illustration starts together with the first hero copy item.
    const heroImage = main.querySelector<HTMLElement>(".hero-img");
    if (heroImage) heroAnimations.push(prepare(heroImage, 1, "right"));

    revealGroups.forEach(({ trigger, targets }) => {
      main.querySelectorAll<HTMLElement>(trigger).forEach((container) => {
        const group: Animation[] = [];

        targets.forEach(({ selector, direction }) => {
          container.querySelectorAll<HTMLElement>(selector).forEach((element) => {
            group.push(prepare(element, group.length, direction));
          });
        });

        if (group.length) groupedAnimations.set(container, group);
      });
    });

    // Two frames guarantee that the paused initial keyframes are committed.
    // This avoids hydration batching the hidden and final states into one paint.
    let secondHeroFrame = 0;
    const firstHeroFrame = requestAnimationFrame(() => {
      secondHeroFrame = requestAnimationFrame(() => {
        heroAnimations.forEach((animation) => animation.play());
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          groupedAnimations.get(entry.target as HTMLElement)?.forEach((animation) => {
            animation.play();
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -18%" },
    );

    groupedAnimations.forEach((_, container) => observer.observe(container));

    return () => {
      cancelAnimationFrame(firstHeroFrame);
      cancelAnimationFrame(secondHeroFrame);
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return null;
}