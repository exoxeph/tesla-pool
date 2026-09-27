import type { CSSProperties } from "react";

// A stylized instrument-panel gauge — the visual anchor of the "CNG meter"
// direction. Decorative dial (like a car speedometer icon), not a data
// chart: the needle position carries no numeric claim, only the digital
// readout below states an actual fact (a real seeded fare).
const TRACK_LENGTH = 251.33; // pi * radius(80), the semicircle arc length

export function FareGauge() {
  return (
    <div className="mx-auto w-full max-w-sm sm:mx-0">
      <svg
        viewBox="0 0 200 130"
        className="w-full"
        role="img"
        aria-label="Illustration of a fare meter dial"
      >
        <path
          d="M20,110 A80,80 0 0,1 180,110"
          fill="none"
          stroke="#DCE3E0"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          className="gauge-fill"
          d="M20,110 A80,80 0 0,1 180,110"
          fill="none"
          stroke="#0B6B2E"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={TRACK_LENGTH}
          style={
            {
              "--gauge-empty": TRACK_LENGTH,
              "--gauge-fill": TRACK_LENGTH * 0.36,
            } as CSSProperties
          }
        />
        {Array.from({ length: 7 }).map((_, i) => {
          const angle = 180 - i * 30;
          const rad = (angle * Math.PI) / 180;
          const x1 = 100 + 68 * Math.cos(rad);
          const y1 = 110 - 68 * Math.sin(rad);
          const x2 = 100 + 80 * Math.cos(rad);
          const y2 = 110 - 80 * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#14181A"
              strokeWidth={2}
            />
          );
        })}
        <line
          className="gauge-needle"
          x1={100}
          y1={110}
          x2={100}
          y2={38}
          stroke="#FFB100"
          strokeWidth={4}
          strokeLinecap="round"
          style={
            {
              "--needle-start": "-90deg",
              "--needle-end": "25deg",
              "--needle-origin": "100px 110px",
            } as CSSProperties
          }
        />
        <circle cx={100} cy={110} r={7} fill="#14181A" />
      </svg>

      <div className="sticker-card meter-tick -mt-3 flex flex-col gap-1 bg-ink-900 px-5 py-4 shadow-md">
        <span className="font-meter text-[10px] uppercase tracking-wider text-green-50">
          Example fare &middot; Banani &rarr; Mohakhali
        </span>
        <span className="font-meter text-3xl text-white">৳150.00</span>
      </div>
    </div>
  );
}
