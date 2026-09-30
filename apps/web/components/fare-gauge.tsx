import { ArrowRight, Car, MapPin, Users } from "@/components/icons";

// A static marketing preview of the request form, shown to logged-out
// visitors — not a live form (that's RideRequestForm, post-login). Real
// matching and fares are both live behind that login, so this card must
// not claim they're still upcoming.
export function FareGauge() {
  return (
    <div className="float-in relative mx-auto w-full max-w-[430px] rounded-3xl border border-white/10 bg-white/[0.08] p-4 shadow-lift backdrop-blur-sm [animation-delay:120ms] sm:p-5">
      <div className="rounded-2xl bg-surface-raised p-5 text-ink-900 shadow-card sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="font-meter text-[9px] uppercase tracking-[0.15em] text-ink-500">MVP route setup</p><p className="mt-1 text-lg font-semibold">Tell us your regular commute</p></div>
          <span className="rounded-full bg-mango-100 px-3 py-1 font-meter text-[8px] font-semibold uppercase tracking-wider text-forest-950">Preview</span>
        </div>

        <div className="relative my-7 pl-7">
          <div className="absolute bottom-3 left-[7px] top-3 border-l-2 border-dashed border-ink-500/30" />
          <div className="relative mb-4 rounded-xl border border-line bg-white px-4 py-3">
            <span className="absolute -left-[29px] top-4 h-4 w-4 rounded-full border-4 border-forest-800 bg-lime-300" />
            <p className="font-meter text-[8px] uppercase tracking-wider text-ink-500">Starting area</p><p className="mt-1 text-sm font-medium text-ink-700">Choose where you usually leave from</p>
          </div>
          <div className="relative rounded-xl border border-line bg-white px-4 py-3">
            <span className="absolute -left-[29px] top-4 h-4 w-4 rounded-full bg-mango-400 ring-4 ring-mango-100" />
            <p className="font-meter text-[8px] uppercase tracking-wider text-ink-500">Destination</p><p className="mt-1 text-sm font-medium text-ink-700">Add where you need to go</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-muted p-4"><Users className="h-4 w-4 text-forest-700"/><p className="mt-3 text-sm font-medium">Ride with others</p><p className="mt-1 text-xs leading-relaxed text-ink-500">Join as a passenger</p></div>
          <div className="rounded-xl bg-surface-muted p-4"><Car className="h-4 w-4 text-forest-700"/><p className="mt-3 text-sm font-medium">Offer empty seats</p><p className="mt-1 text-xs leading-relaxed text-ink-500">Join as a driver</p></div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-5"><span className="flex items-center gap-2 text-xs text-ink-500"><MapPin className="h-4 w-4"/>Real matching &amp; fares — sign up to try</span><ArrowRight className="h-4 w-4 text-forest-700"/></div>
      </div>
      <div className="absolute -bottom-5 -left-4 rounded-2xl bg-mango-400 px-4 py-3 text-forest-950 shadow-card sm:-left-8"><p className="font-meter text-[8px] uppercase tracking-wider">Early-stage product</p><p className="font-display text-2xl font-semibold leading-none">Built with commuters</p></div>
    </div>
  );
}
