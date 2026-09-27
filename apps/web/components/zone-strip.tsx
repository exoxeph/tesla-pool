const ZONES = [
  "Banani",
  "Gulshan 1",
  "Gulshan 2",
  "Mohakhali",
  "Dhanmondi",
  "Mirpur",
  "Uttara",
  "Farmgate",
  "Bashundhara",
];

// Rotation alternates so the stickers read as stuck on by hand, not a
// generated grid — but stays deterministic (no random) so server and
// client render identically.
const ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2deg", "-1.5deg", "1deg"];

export function ZoneStrip() {
  return (
    <div className="dash-grid rounded-lg border border-border bg-surface-card px-4 py-6 sm:px-6">
      <p className="font-meter text-[10px] uppercase tracking-wider text-ink-600">
        Live in these zones today
      </p>
      <ul className="mt-4 flex flex-wrap gap-3">
        {ZONES.map((zone, i) => (
          <li
            key={zone}
            className="sticker-card border border-border bg-surface px-3 py-1.5 font-sans text-sm text-ink-900 shadow-sm"
            style={{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]})` }}
          >
            {zone}
          </li>
        ))}
      </ul>
    </div>
  );
}
