"use client";

import { useEffect, useRef, useState } from "react";
import type { Card, OriginMemento, Program, Puesto } from "@/generated/prisma/client";
import LyCardView from "./LyCardView";

export type CarouselBundle = {
  card: Card;
  qrSvg: string;
  originMemento: OriginMemento | null;
  program: Program | null;
  puesto: Puesto | null;
};

// Swipeable Programa/Business/Personal carousel for a Member's 3 Cards —
// native horizontal scroll-snap (real touch swipe, no gesture library).
// Each slide is a full, independently-interactive LyCardView; this wrapper
// only tracks which one is centered (for the dot indicator) and scrolls to
// the Card whose link was actually opened on first paint.
export default function CardCarousel({
  cards,
  initialSlug,
  isAdmin,
  isHost,
}: {
  cards: CarouselBundle[];
  initialSlug: string;
  isAdmin: boolean;
  isHost: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const initialIndex = Math.max(
    0,
    cards.findIndex((c) => c.card.slug === initialSlug)
  );
  const [active, setActive] = useState(initialIndex);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = initialIndex * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!el || el.clientWidth === 0) return;
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setActive((prev) => (prev === idx ? prev : idx));
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div style={{ position: "relative", height: "100dvh", width: "100%", overflow: "hidden", background: "#09090b" }}>
      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {cards.map((c) => (
          <div key={c.card.slug} style={{ flex: "0 0 100%", width: "100%", height: "100%", scrollSnapAlign: "start" }}>
            <LyCardView
              card={c.card}
              qrSvg={c.qrSvg}
              isAdmin={isAdmin}
              isHost={isHost}
              originMemento={c.originMemento}
              program={c.program}
              puesto={c.puesto}
            />
          </div>
        ))}
      </div>

      {/* Bottom-anchored (2026-09-16), below whatever CTA a card ends
          with (schedule button, or the cube row on personal cards) —
          absolute against the whole carousel viewport, so it lands in
          the same safe spot regardless of card kind. */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom,0px) + 6px)",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 6,
          pointerEvents: "none",
          zIndex: 40,
        }}
      >
        {cards.map((c, i) => (
          <span
            key={c.card.slug}
            style={{
              width: i === active ? 16 : 6,
              height: 6,
              borderRadius: 999,
              background: i === active ? "#E5C378" : "rgba(200,161,90,.35)",
              boxShadow: "0 1px 3px rgba(0,0,0,.5)",
              transition: "width .2s ease, background .2s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
