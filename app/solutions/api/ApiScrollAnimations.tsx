"use client";

import { useLayoutEffect } from "react";
import styles from "./page.module.css";

type RevealDirection = "left" | "right" | "up" | "down" | "scale";

type RevealTarget = {
  selector: string;
  direction?: RevealDirection;
};

type RevealGroup = {
  trigger: string;
  targets: RevealTarget[];
};

// Match HomeScrollAnimations: movement and stagger are 15% longer than the original timing.
const REVEAL_DURATION_MS = 1150;
const SCALE_REVEAL_DURATION_MS = 1265;
const STAGGER_MS = 161;

// Mirror HomeScrollAnimations heroTargets (indices start at 1 after the header slot).
// Subtitle lives inside the title node, so it reveals with the heading.
// Audience maps to hero-benefits (up); buttons map to hero-buttons (left) and
// keep the same stagger order as on the home page (buttons before benefits).
const heroTargets: RevealTarget[] = [
  { selector: `.${styles.badge}`, direction: "left" },
  { selector: `.${styles.title}`, direction: "left" },
  { selector: `.${styles.description}`, direction: "left" },
  { selector: `.${styles.actions}`, direction: "left" },
  { selector: `.${styles.audience}`, direction: "up" },
];

const revealGroups: RevealGroup[] = [
  {
    trigger: `.${styles.dataSection}`,
    targets: [
      { selector: `.${styles.dataIntro}`, direction: "left" },
      { selector: `.${styles.dataCard}`, direction: "scale" },
    ],
  },
  {
    trigger: `.${styles.sourcesSection}`,
    targets: [
      { selector: `.${styles.sourcesIntro}`, direction: "left" },
      { selector: `.${styles.sourcesCard}`, direction: "scale" },
      { selector: `.${styles.sourcesNote}` },
    ],
  },
  {
    trigger: `.${styles.depthSection}`,
    targets: [
      { selector: `.${styles.depthIntro}`, direction: "left" },
      { selector: `.${styles.depthVisual}`, direction: "right" },
    ],
  },
  {
    trigger: `.${styles.modulesSection}`,
    targets: [{ selector: `.${styles.modulesFrame}` }],
  },
  {
    trigger: `.${styles.integrationSection}`,
    targets: [
      { selector: `.${styles.integrationIntro}`, direction: "left" },
      { selector: `.${styles.integrationAside}`, direction: "right" },
    ],
  },
  {
    trigger: `.${styles.startSection}`,
    targets: [{ selector: `.${styles.startBanner}` }],
  },
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
  duration = direction === "scale" ? SCALE_REVEAL_DURATION_MS : REVEAL_DURATION_MS,
) {
  const layoutTransform = getComputedStyle(element).transform;
  const finalTransform = layoutTransform === "none" ? "none" : layoutTransform;
  const initialRevealTransform =
    finalTransform === "none"
      ? revealTransform[direction]
      : `${revealTransform[direction]} ${finalTransform}`;

  const animation = element.animate(
    [
      { opacity: 0, transform: initialRevealTransform },
      { opacity: 1, transform: finalTransform },
    ],
    {
      duration,
      delay,
      easing:
        direction === "scale"
          ? "cubic-bezier(0.16, 1, 0.3, 1)"
          : "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    },
  );

  animation.pause();
  // Drop the finished effect so card hover transforms are not overridden.
  animation.onfinish = () => animation.cancel();
  return animation;
}

export default function ApiScrollAnimations() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(".site-main");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const animations: Animation[] = [];
    const groupedAnimations = new Map<HTMLElement, Animation[]>();

    const prepare = (
      element: HTMLElement,
      index = 0,
      direction: RevealDirection = "up",
    ) => {
      const animation = createRevealAnimation(
        element,
        direction,
        index * STAGGER_MS,
      );
      animations.push(animation);
      return animation;
    };

    // Play on load after two frames — same hydration-safe start as the home hero.
    // Do not animate .visual / cards: they keep their own CSS enter + flip.
    const heroAnimations: Animation[] = [];
    const hero = root.querySelector<HTMLElement>(`.${styles.hero}`);
    if (hero) {
      heroTargets.forEach(({ selector, direction }, index) => {
        const element = hero.querySelector<HTMLElement>(selector);
        if (element) heroAnimations.push(prepare(element, index + 1, direction));
      });
    }

    revealGroups.forEach(({ trigger, targets }) => {
      root.querySelectorAll<HTMLElement>(trigger).forEach((container) => {
        const group: Animation[] = [];

        targets.forEach(({ selector, direction }) => {
          container.querySelectorAll<HTMLElement>(selector).forEach((element) => {
            group.push(prepare(element, group.length, direction));
          });
        });

        if (group.length) groupedAnimations.set(container, group);
      });
    });

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
