"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authedFetch, getAuthToken } from "@/lib/auth-client";

type Tesla = {
  id: string;
  label: string;
  capacity: number;
  isOnline: boolean;
};

export default function DriverDashboardPage() {
  const router = useRouter();
  const [tesla, setTesla] = useState<Tesla | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/login?role=driver");
      return;
    }

    authedFetch<{ tesla: Tesla }>("/drivers/me")
      .then((data) => setTesla(data.tesla))
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load.");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  async function handleToggle() {
    if (!tesla) return;
    setToggleError(null);
    setIsToggling(true);

    try {
      const data = await authedFetch<{ tesla: Tesla }>("/drivers/me/status", {
        method: "PATCH",
        body: { isOnline: !tesla.isOnline },
      });
      setTesla(data.tesla);
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-14 sm:py-20">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-wide text-ink-900">
          Driver dashboard
        </h1>
        <p className="mt-2 font-sans text-base text-ink-600">
          Placeholder dashboard — matching and pool status land in a later
          feature branch.
        </p>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-ink-600">Loading your vehicle...</p>
      ) : loadError ? (
        <p
          role="alert"
          className="rounded-md border border-danger-600 bg-danger-50 px-3 py-2 text-sm text-danger-600"
        >
          {loadError}
        </p>
      ) : tesla ? (
        <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface-card p-6">
          <div>
            <p className="font-meter text-[10px] uppercase tracking-wider text-ink-600">
              Your vehicle
            </p>
            <p className="font-display text-3xl uppercase tracking-wide text-ink-900">
              {tesla.label}
            </p>
            <p className="font-sans text-sm text-ink-600">
              {tesla.capacity} seat{tesla.capacity === 1 ? "" : "s"}
            </p>
          </div>

          {toggleError ? (
            <p
              role="alert"
              className="rounded-md border border-danger-600 bg-danger-50 px-3 py-2 text-sm text-danger-600"
            >
              {toggleError}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <span className="font-sans text-sm font-medium text-ink-900">
              Status:{" "}
              <span className={tesla.isOnline ? "text-green-600" : "text-ink-600"}>
                {tesla.isOnline ? "Online" : "Offline"}
              </span>
            </span>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isToggling}
              className={
                "sticker-card -rotate-1 inline-flex items-center justify-center border-4 px-5 py-2 font-display text-base uppercase tracking-wide transition-transform hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 " +
                (tesla.isOnline
                  ? "border-ink-900 bg-surface text-ink-900"
                  : "border-green-500 bg-surface-card text-ink-900")
              }
            >
              {isToggling
                ? "Updating..."
                : tesla.isOnline
                  ? "Go offline"
                  : "Go online"}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
