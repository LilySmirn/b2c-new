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

// Keep the reveal rhythm deliberately relaxed: both the movement and the gap
// between successive elements are 15% longer than the original timing.
const REVEAL_DURATION_MS = 1150;
const SCALE_REVEAL_DURATION_MS = 1265;
const STAGGER_MS = 161;
const HERO_IMAGE_DURATION_MS = REVEAL_DURATION_MS + STAGGER_MS * 3;

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

function markRevealDone(element: HTMLElement) {
  element.dataset.reveal = "done";
}

function createRevealAnimation(
  element: HTMLElement,
  direction: RevealDirection = "up",
  delay = 0,
  duration = direction === "scale" ? SCALE_REVEAL_DURATION_MS : REVEAL_DURATION_MS,
  persistReveal = false,
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
      duration,
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
  // Persist CSS visibility before dropping the WAAPI effect, otherwise
  // cancel() falls back to the pre-reveal opacity:0 rule.
  animation.onfinish = () => {
    if (persistReveal) markRevealDone(element);
    animation.cancel();
  };
  return animation;
}

export default function HomeScrollAnimations() {
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>(".main");
    if (!main || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animations: Animation[] = [];
    const groupedAnimations = new Map<HTMLElement, Animation[]>();
    const heroElements: HTMLElement[] = [];

    const prepare = (
      element: HTMLElement,
      index = 0,
      direction: RevealDirection = "up",
      duration?: number,
      persistReveal = false,
    ) => {
      const animation = createRevealAnimation(
        element,
        direction,
        index * STAGGER_MS,
        duration,
        persistReveal,
      );
      animations.push(animation);
      return animation;
    };

    const revealHeroFallback = () => {
      heroElements.forEach(markRevealDone);
    };

    let secondHeroFrame = 0;
    let firstHeroFrame = 0;
    let observer: IntersectionObserver | null = null;

    try {
      const heroAnimations: Animation[] = [];
      const header = document.querySelector<HTMLElement>(".header-section");
      if (header) {
        header.removeAttribute("data-reveal");
        heroElements.push(header);
        heroAnimations.push(prepare(header, 0, "down", undefined, true));
      }

      heroTargets.forEach(({ selector, direction }, index) => {
        const element = main.querySelector<HTMLElement>(selector);
        if (!element) return;
        element.removeAttribute("data-reveal");
        heroElements.push(element);
        heroAnimations.push(prepare(element, index + 1, direction, undefined, true));
      });

      // The main illustration starts together with the first hero copy item, but
      // travels more slowly so it settles at the same time as the hero buttons.
      const heroImage = main.querySelector<HTMLElement>(".hero-img");
      if (heroImage) {
        heroImage.removeAttribute("data-reveal");
        heroElements.push(heroImage);
        heroAnimations.push(prepare(heroImage, 1, "right", HERO_IMAGE_DURATION_MS, true));
      }

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

      // Two frames: Strict Mode cleanup cancels the first effect's rAFs before
      // paint, so only the surviving effect plays — once, from the paused state.
      firstHeroFrame = requestAnimationFrame(() => {
        secondHeroFrame = requestAnimationFrame(() => {
          try {
            heroAnimations.forEach((animation) => animation.play());
          } catch {
            revealHeroFallback();
          }
        });
      });

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            groupedAnimations.get(entry.target as HTMLElement)?.forEach((animation) => {
              animation.play();
            });
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -18%" },
      );

      groupedAnimations.forEach((_, container) => observer?.observe(container));
    } catch {
      revealHeroFallback();
    }

    return () => {
      cancelAnimationFrame(firstHeroFrame);
      cancelAnimationFrame(secondHeroFrame);
      observer?.disconnect();
      // Cancel without marking done: CSS opacity:0 still applies, so Strict Mode
      // remount does not flash the final state before the next effect attaches.
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return null;
}
