import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b-4 border-green-500 bg-surface">
      <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="sticker-card -rotate-2 flex h-9 w-9 items-center justify-center bg-green-600 font-meter text-sm font-medium text-white shadow-sm"
          >
            DT
          </span>
          <span className="font-display text-2xl font-medium uppercase tracking-wide text-ink-900">
            Dhaka Tesla Pool
          </span>
        </Link>
      </div>
    </header>
  );
}
