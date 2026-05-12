"use client";

import { useEffect, useState } from "react";

// Full-viewport intro video shown on every full page load. The component
// sits in the root layout, which mounts once per page load, so client-side
// navigation between routes doesn't replay it — only a refresh/fresh visit.
//
// Mobile viewports get a different cut of the video. The choice is made
// client-side in useEffect so SSR renders an empty overlay (no <video>),
// which avoids both a hydration mismatch and downloading the wrong file.
export function IntroLoader() {
  const [done, setDone] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    setSrc(isMobile ? "/media/loader-mobile.mp4" : "/media/loader.mp4");
  }, []);

  if (done) return null;

  return (
    <div
      data-hyp3-loader
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
    >
      {src && (
        <video
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => setDone(true)}
          onError={() => setDone(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
