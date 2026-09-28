// The direction contract names this motif explicitly: "seat occupancy
// reads as a segmented, counted strip, never a soft progress bar." Used
// both as an input (driver signup) and read-only (driver dashboard).
const SEATS = [1, 2, 3, 4, 5, 6] as const;

export function SeatPicker({
  value,
  onChange,
  readOnly = false,
  id,
}: {
  value: number;
  onChange?: (seats: number) => void;
  readOnly?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      role={readOnly ? undefined : "radiogroup"}
      aria-label={readOnly ? undefined : "Seat capacity"}
      className="grid grid-cols-6 gap-2"
    >
      {SEATS.map((seat) => {
        const selected = seat === value;
        return (
          <button
            key={seat}
            type="button"
            role={readOnly ? undefined : "radio"}
            aria-checked={readOnly ? undefined : selected}
            disabled={readOnly}
            onClick={() => onChange?.(seat)}
            className={
              "focus-ring flex h-10 min-w-0 items-center justify-center rounded-xl border font-meter text-xs transition " +
              (selected
                ? "border-forest-800 bg-forest-800 text-lime-300 shadow-sm"
                : "border-line bg-white text-ink-500 hover:border-forest-700") +
              (readOnly ? " cursor-default" : " cursor-pointer")
            }
          >
            {seat}
          </button>
        );
      })}
    </div>
  );
}
