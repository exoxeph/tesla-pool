"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authedFetch, getAuthToken } from "@/lib/auth-client";
import { SeatPicker } from "@/components/seat-picker";

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
        setLoadError(
          err instanceof Error
            ? err.message
            : "Couldn't reach the server. Check your connection and try again."
        );
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
      setToggleError(
        err instanceof Error
          ? err.message
          : "Couldn't update your status. Check your connection and try again."
      );
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
        <p className="mt-2 font-meter text-[10px] uppercase tracking-wider text-ink-600">
          Placeholder — matching and pool status land in a later feature branch
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
        <div
          className={
            "dash-grid flex flex-col gap-5 rounded-b-lg border-t-4 bg-surface-card p-6 transition-colors " +
            (tesla.isOnline ? "border-t-green-600" : "border-t-ink-900")
          }
        >
          <div>
            <p className="font-meter text-[10px] uppercase tracking-wider text-ink-600">
              Your vehicle
            </p>
            <p className="font-display text-3xl uppercase tracking-wide text-ink-900">
              {tesla.label}
            </p>
            <div className="mt-2">
              <SeatPicker value={tesla.capacity} readOnly />
            </div>
          </div>

          {toggleError ? (
            <p
              role="alert"
              className="rounded-md border border-danger-600 bg-danger-50 px-3 py-2 text-sm text-danger-600"
            >
              {toggleError}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-sans text-sm font-medium text-ink-900">
                  Status:{" "}
                  <span className={tesla.isOnline ? "text-green-600" : "text-ink-600"}>
                    {tesla.isOnline ? "Online" : "Offline"}
                  </span>
                </span>
                {tesla.isOnline ? (
                  <p
                    key="online-confirm"
                    className="meter-tick font-meter text-[10px] uppercase tracking-wider text-green-600"
                  >
                    Visible to riders now
                  </p>
                ) : null}
              </div>
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
        </div>
      ) : null}
    </main>
  );
}
