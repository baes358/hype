"use client";

import { useState } from "react";

// Full-viewport intro video shown on every full page load. The component
// sits in the root layout, which mounts once per page load, so client-side
// navigation between routes doesn't replay it — only a refresh/fresh visit.
export function IntroLoader() {
  const [done, setDone] = useState(false);

  if (done) return null;

  return (
    <div
      data-hyp3-loader
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
    >
      <video
        src="/media/loader.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setDone(true)}
        onError={() => setDone(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
