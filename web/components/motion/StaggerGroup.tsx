"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, type ReactNode } from "react";

import { EASING } from "./easing";

type Props = {
  children: ReactNode;
  /** Delay between each child's animation start, in milliseconds. */
  staggerMs?: number;
  /** Delay before the first child starts, in seconds. */
  delay?: number;
  className?: string;
};

// Reveals children sequentially on viewport entry. Each child gets wrapped in
// a motion.div sized to fit its grid cell / flex slot — works inside grid,
// flex, or block parents because the wrapper is transparent to layout (it
// just inherits the cell it sits in).
export function StaggerGroup({
  children,
  staggerMs = 60,
  delay = 0,
  className,
}: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  const items = Children.map(children, (child, i) => (
    <motion.div
      key={i}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, ease: EASING }}
    >
      {child}
    </motion.div>
  ));

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            delayChildren: delay,
            staggerChildren: staggerMs / 1000,
          },
        },
      }}
    >
      {items}
    </motion.div>
  );
}
