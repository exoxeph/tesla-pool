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
      className="flex gap-1.5"
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
              "flex h-9 w-9 items-center justify-center rounded-md border-2 font-meter text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 " +
              (selected
                ? "border-green-600 bg-green-600 text-white"
                : "border-border bg-surface text-ink-600") +
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
