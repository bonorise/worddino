"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function BrandBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);

  const fitText = () => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) {
      return;
    }

    const containerWidth = container.clientWidth;
    if (!containerWidth) {
      return;
    }

    const computed = window.getComputedStyle(text);
    const currentSize = parseFloat(computed.fontSize);
    const textWidth = text.getBoundingClientRect().width;
    if (!textWidth || !currentSize) {
      return;
    }

    const nextSize = (currentSize * containerWidth) / textWidth;
    if (Math.abs(nextSize - currentSize) > 0.5) {
      setFontSize(nextSize);
    }
  };

  useLayoutEffect(() => {
    fitText();
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => fitText());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => fitText());
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full bg-muted/10">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
        <div
          ref={containerRef}
          className="w-full"
          aria-label="WordDino"
        >
          <div
            ref={textRef}
            className="inline-block whitespace-nowrap font-serif font-semibold leading-none text-foreground/20"
            style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
          >
            WordDino
          </div>
        </div>
      </div>
    </div>
  );
}
