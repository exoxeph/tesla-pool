"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, LogoMark } from "@/components/icons";
import { clearAuth, getAuthRole, getAuthToken } from "@/lib/auth-client";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  // Starts signed-out on the server render; corrected right after mount
  // so hydration never has to guess at localStorage — same pattern every
  // dashboard page already uses (getAuthToken() read inside useEffect).
  // Re-checked on every pathname change, not just once on mount: this
  // header lives in the root layout, which the App Router does NOT
  // remount on a client-side router.push() (e.g. the login form's
  // redirect to /dashboard right after saveAuthToken) — without the
  // pathname dependency, login/signup/logout all land on a page whose
  // header still reflects whatever was true when the layout first
  // mounted, not the auth state that redirect just created.
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setAuthed(!!getAuthToken());
    setRole(getAuthRole());
  }, [pathname]);

  function handleLogout() {
    clearAuth();
    setAuthed(false);
    setRole(null);
    router.push("/");
  }

  const dashboardHref = role === "DRIVER" ? "/driver/dashboard" : "/dashboard";

  return (
    <header className="relative z-40 border-b border-white/10 bg-forest-900 text-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl" aria-label="Dhaka Tesla Pool home">
          <LogoMark className="h-10 w-10 text-lime-300" />
          <span className="leading-none">
            <span className="block font-display text-[1.35rem] font-semibold uppercase tracking-[0.04em]">Dhaka Tesla</span>
            <span className="block font-meter text-[8px] uppercase tracking-[0.28em] text-lime-300">Pool together · move better</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          {authed ? (
            <>
              <Link
                href={dashboardHref}
                className="focus-ring hidden rounded-full px-4 py-2 text-sm font-medium text-white/75 transition hover:text-white sm:block"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login?role=passenger"
                className="focus-ring hidden rounded-full px-4 py-2 text-sm font-medium text-white/75 transition hover:text-white sm:block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-lime-200"
              >
                Join the pool <ArrowUpRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
