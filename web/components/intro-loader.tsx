"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "hyp3.loader_shown";

// Full-viewport intro video shown once per browser session. The check for
// the session flag runs twice: synchronously in an inline <head> script
// (which adds .hyp3-loader-hidden to <html> so SSR'd output is hidden before
// paint) and again here in useEffect (which removes the element from the
// DOM so the muted video isn't streamed in the background). The dual check
// avoids both a flash of loader on repeat visits and a hydration mismatch.
export function IntroLoader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) setDone(true);
    } catch {
      // sessionStorage can throw in some privacy modes — fall through and
      // let the video play.
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Same fallback — dismissing without persisting is fine.
    }
    setDone(true);
  };

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
        onEnded={dismiss}
        onError={dismiss}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
