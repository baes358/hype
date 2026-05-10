"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Scroll Y at which the condensed state is fully reached. Default 120. */
  threshold?: number;
};

// Sticky toolbar that softly condenses padding and intensifies its backdrop
// blur as the page scrolls. Uses MotionValues so style updates run inside
// rAF without re-rendering React. Falls back to a static div when the user
// has reduced-motion preference.
export function AnimatedToolbar({
  children,
  className,
  threshold = 120,
}: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  // Vertical padding shrinks 16px → 10px over the threshold range.
  const paddingY = useTransform(scrollY, [0, threshold], [16, 10], {
    clamp: true,
  });
  // Background opacity bumps so the surface feels more "settled" once stuck.
  const bgAlpha = useTransform(scrollY, [0, threshold], [0.65, 0.88], {
    clamp: true,
  });
  const backgroundColor = useTransform(
    bgAlpha,
    (a) => `rgba(255, 255, 255, ${a})`
  );
  // Backdrop blur intensifies slightly.
  const blurPx = useTransform(scrollY, [0, threshold], [10, 16], {
    clamp: true,
  });
  const backdropFilter = useTransform(blurPx, (v) => `blur(${v}px)`);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      style={{
        paddingTop: paddingY,
        paddingBottom: paddingY,
        backgroundColor,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
      }}
    >
      {children}
    </motion.div>
  );
}
