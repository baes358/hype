"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { EASING } from "./easing";

type Props = {
  children: ReactNode;
  /** Delay in seconds before this element starts animating. */
  delay?: number;
  /** Override the default 500ms duration. */
  duration?: number;
  className?: string;
};

// Fades + slides up on viewport entry. Single-shot per element.
export function FadeInSection({
  children,
  delay = 0,
  duration = 0.5,
  className,
}: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration, delay, ease: EASING }}
    >
      {children}
    </motion.div>
  );
}
