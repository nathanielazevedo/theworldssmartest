"use client";

import { motion } from "framer-motion";

/** A quick emoji confetti burst, fired from the center of its container. */
export function Burst({ big = false }: { big?: boolean }) {
  const emojis = big
    ? ["🎉", "🧠", "✨", "⭐", "🏆", "💥", "👑"]
    : ["🎉", "✨", "🧠", "⭐", "💥"];
  const n = big ? 18 : 10;
  const parts = Array.from({ length: n }).map((_, i) => ({
    e: emojis[i % emojis.length],
    x: (Math.random() - 0.5) * (big ? 420 : 300),
    y: -(Math.random() * (big ? 320 : 200) + 80),
    r: (Math.random() - 0.5) * 120,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute ${big ? "text-3xl" : "text-2xl"}`}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.3, rotate: p.r }}
          transition={{ duration: big ? 1.4 : 1, ease: "easeOut" }}
        >
          {p.e}
        </motion.span>
      ))}
    </div>
  );
}

/** The shame equivalent of confetti: donkeys tumbling down the screen. */
export function DonkeyRain({ big = false }: { big?: boolean }) {
  const n = big ? 16 : 9;
  const parts = Array.from({ length: n }).map(() => ({
    x: (Math.random() - 0.5) * (big ? 400 : 300),
    delay: Math.random() * 0.35,
    r: (Math.random() - 0.5) * 200,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center overflow-visible">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute ${big ? "text-4xl" : "text-3xl"}`}
          initial={{ opacity: 0, x: p.x, y: -140, scale: 0.6, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: big ? 340 : 260,
            scale: 1,
            rotate: p.r,
          }}
          transition={{ duration: 1.3, delay: p.delay, ease: "easeIn" }}
        >
          🫏
        </motion.span>
      ))}
    </div>
  );
}
