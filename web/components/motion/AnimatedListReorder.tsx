"use client";

import { LayoutGroup, MotionConfig, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { EASING } from "./easing";

type Props = {
  children: ReactNode;
  className?: string;
  /** Optional id to scope the LayoutGroup. Useful when multiple lists coexist. */
  id?: string;
};

// Coordinates FLIP-style layout animations between sibling AnimatedRows.
// Doesn't render markup of its own beyond the wrapping div; just provides the
// LayoutGroup context and the shared transition timing. Reduce-motion users
// get a plain div passthrough.
export function AnimatedListReorder({ children, className, id }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <MotionConfig transition={{ duration: 0.35, ease: EASING }}>
      <LayoutGroup id={id}>
        <div className={className}>{children}</div>
      </LayoutGroup>
    </MotionConfig>
  );
}
