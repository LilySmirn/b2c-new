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

// Match HomeScrollAnimations / ApiScrollAnimations timing.
const REVEAL_DURATION_MS = 1150;
const SCALE_REVEAL_DURATION_MS = 1265;
const STAGGER_MS = 161;

const revealGroups: RevealGroup[] = [
  {
    trigger: `.${styles.products}`,
    targets: [
      { selector: `.${styles.productsHeading}` },
      { selector: `.${styles.productsLead}` },
      { selector: `.${styles.productCard}`, direction: "scale" },
    ],
  },
  {
    trigger: `.${styles.why}`,
    targets: [{ selector: `.${styles.whyBanner}` }],
  },
  {
    trigger: `.${styles.help}`,
    targets: [
      { selector: `.${styles.helpHeading}` },
      { selector: `.${styles.helpLead}` },
      { selector: `.${styles.helpCard}`, direction: "scale" },
    ],
  },
  {
    trigger: `.${styles.integrations}`,
    targets: [{ selector: `.${styles.integrationsBanner}` }],
  },
  {
    trigger: `.${styles.collaboration}`,
    targets: [{ selector: `.${styles.collaborationBanner}` }],
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

export default function AboutScrollAnimations() {
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
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return null;
}
