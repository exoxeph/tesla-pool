import Link from "next/link";
import { FareGauge } from "@/components/fare-gauge";
import { ZoneStrip } from "@/components/zone-strip";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-14 sm:py-20">
      <div className="grid gap-10 sm:grid-cols-[1.1fr_0.9fr] sm:items-center sm:gap-8">
        <div>
          <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-wide text-ink-900 sm:text-6xl">
            Share a seat.
            <br />
            Split the fare.
            <br />
            Survive Dhaka traffic.
          </h1>
          <p className="mt-5 max-w-[55ch] font-sans text-lg text-ink-600">
            Dhaka Tesla Pool matches you with passengers heading your way,
            so you split a real fare instead of paying for the whole ride
            alone.
          </p>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row">
            <Link
              href="/login?role=passenger"
              className="sticker-card group inline-flex -rotate-1 flex-col items-start gap-1 border-4 border-green-500 bg-surface-card px-6 py-4 shadow-md transition-transform hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              <span className="font-meter text-[10px] uppercase tracking-wider text-green-600">
                Passenger permit
              </span>
              <span className="font-display text-2xl uppercase tracking-wide text-ink-900">
                Continue as Passenger
              </span>
            </Link>
            <Link
              href="/login?role=driver"
              className="sticker-card inline-flex rotate-1 flex-col items-start gap-1 border-2 border-ink-900 bg-surface-card px-6 py-4 shadow-sm transition-transform hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              <span className="font-meter text-[10px] uppercase tracking-wider text-ink-600">
                Driver permit &middot; 3 seats
              </span>
              <span className="font-display text-2xl uppercase tracking-wide text-ink-900">
                Continue as Driver
              </span>
            </Link>
          </div>

          <p className="mt-4 font-sans text-sm text-ink-600">
            New here?{" "}
            <Link href="/signup" className="font-medium text-green-600 underline">
              Sign up
            </Link>
          </p>
        </div>

        {/* Authored SVG gauge — the direction's signature illustration,
            not a stock icon or gradient placeholder. */}
        <FareGauge />
      </div>

      <ZoneStrip />
    </main>
  );
}
