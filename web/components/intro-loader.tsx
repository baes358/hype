"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PLAYBACK_RATE = 1.25;
const FADE_MS = 700;

export function IntroLoader() {
  const [done, setDone] = useState(false);
  const [fading, setFading] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const fadingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    setSrc(isMobile ? "/media/loader-mobile.mp4" : "/media/loader.mp4");
  }, []);

  const beginFade = useCallback(() => {
    if (fadingRef.current) return;
    fadingRef.current = true;
    setFading(true);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setDone(true), FADE_MS);
  }, []);

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        beginFade();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [done, beginFade]);

  useEffect(() => {
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  if (done) return null;

  return (
    <div
      data-hyp3-loader
      onClick={beginFade}
      onTouchStart={beginFade}
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        willChange: "opacity",
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
    >
      {src && (
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el) el.playbackRate = PLAYBACK_RATE;
          }}
          src={src}
          autoPlay
          muted
          playsInline
          // @ts-expect-error - non-standard but recognized by iOS WebKit
          webkit-playsinline="true"
          preload="auto"
          tabIndex={-1}
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            v.playbackRate = PLAYBACK_RATE;
            const p = v.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          }}
          onEnded={beginFade}
          onError={beginFade}
          className="pointer-events-none h-full w-full object-cover"
        />
      )}
    </div>
  );
}
