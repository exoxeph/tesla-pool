"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { postAuth, saveAuthToken } from "@/lib/auth-client";
import { isValidPhone } from "@/lib/validation";
import { SeatPicker } from "@/components/seat-picker";

type SignupResponse = {
  token: string;
  user: { id: string; name: string; phone: string; role: string };
};

type DriverSignupResponse = SignupResponse & {
  tesla: { id: string; label: string; capacity: number; isOnline: boolean };
};

type Role = "passenger" | "driver";
type FieldErrors = Partial<
  Record<"name" | "phone" | "password" | "vehicleLabel", string>
>;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole: Role =
    searchParams.get("role") === "driver" ? "driver" : "passenger";

  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [capacity, setCapacity] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!isValidPhone(phone)) {
      errors.phone = "Enter a valid Bangladeshi phone number.";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (role === "driver" && !vehicleLabel.trim()) {
      errors.vehicleLabel = "Vehicle label is required.";
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      if (role === "passenger") {
        const data = await postAuth<SignupResponse>("/auth/signup", {
          name,
          phone,
          password,
        });
        saveAuthToken(data.token);
        router.push("/dashboard");
      } else {
        const data = await postAuth<DriverSignupResponse>(
          "/auth/driver-signup",
          { name, phone, password, vehicleLabel, capacity }
        );
        saveAuthToken(data.token);
        router.push("/driver/dashboard");
      }
    } catch (err) {
      // Only network/server-level failures reach here — field-level
      // problems are already caught above without a round trip.
      setFormError(
        err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-14 sm:py-20">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-wide text-ink-900">
          Create an account
        </h1>
        <p className="mt-2 font-sans text-base text-ink-600">
          Choose how you&apos;ll use Dhaka Tesla Pool.
        </p>
      </div>

      <div role="radiogroup" aria-label="Account type" className="flex gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={role === "passenger"}
          onClick={() => setRole("passenger")}
          className={
            "sticker-card flex-1 border-4 px-4 py-3 font-display text-lg uppercase tracking-wide transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 " +
            (role === "passenger"
              ? "-rotate-1 border-green-500 bg-surface-card text-ink-900"
              : "rotate-0 border-border bg-surface text-ink-600")
          }
        >
          Passenger
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={role === "driver"}
          onClick={() => setRole("driver")}
          className={
            "sticker-card flex-1 border-4 px-4 py-3 font-display text-lg uppercase tracking-wide transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 " +
            (role === "driver"
              ? "rotate-1 border-green-500 bg-surface-card text-ink-900"
              : "rotate-0 border-border bg-surface text-ink-600")
          }
        >
          Driver
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="permit-card flex flex-col gap-5 rounded-b-lg p-6"
      >
        {formError ? (
          <p
            role="alert"
            className="rounded-md border border-danger-600 bg-danger-50 px-3 py-2 text-sm text-danger-600"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="font-sans text-sm font-medium text-ink-900">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={
              "rounded-md border bg-surface px-3 py-2 font-sans text-base text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 " +
              (fieldErrors.name ? "border-danger-600" : "border-border")
            }
          />
          {fieldErrors.name ? (
            <p id="name-error" className="font-sans text-xs text-danger-600">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="font-sans text-sm font-medium text-ink-900">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={
              "rounded-md border bg-surface px-3 py-2 font-sans text-base text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 " +
              (fieldErrors.phone ? "border-danger-600" : "border-border")
            }
          />
          {fieldErrors.phone ? (
            <p id="phone-error" className="font-sans text-xs text-danger-600">
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-sans text-sm font-medium text-ink-900">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby="password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={
              "rounded-md border bg-surface px-3 py-2 font-sans text-base text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 " +
              (fieldErrors.password ? "border-danger-600" : "border-border")
            }
          />
          <p
            id="password-hint"
            className={
              "font-sans text-xs " +
              (fieldErrors.password ? "text-danger-600" : "text-ink-600")
            }
          >
            {fieldErrors.password ?? "At least 8 characters."}
          </p>
        </div>

        {role === "driver" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vehicleLabel" className="font-sans text-sm font-medium text-ink-900">
                Vehicle label
              </label>
              <input
                id="vehicleLabel"
                name="vehicleLabel"
                type="text"
                placeholder="e.g. Bullet"
                aria-invalid={Boolean(fieldErrors.vehicleLabel)}
                aria-describedby={fieldErrors.vehicleLabel ? "vehicle-error" : undefined}
                value={vehicleLabel}
                onChange={(e) => setVehicleLabel(e.target.value)}
                className={
                  "rounded-md border bg-surface px-3 py-2 font-sans text-base text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 " +
                  (fieldErrors.vehicleLabel ? "border-danger-600" : "border-border")
                }
              />
              {fieldErrors.vehicleLabel ? (
                <p id="vehicle-error" className="font-sans text-xs text-danger-600">
                  {fieldErrors.vehicleLabel}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-sans text-sm font-medium text-ink-900">
                Seat capacity
              </span>
              <SeatPicker value={capacity} onChange={setCapacity} />
            </div>
          </>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="sticker-card -rotate-1 inline-flex items-center justify-center border-4 border-green-500 bg-surface-card px-6 py-3 font-display text-xl uppercase tracking-wide text-ink-900 transition-transform hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="font-sans text-sm text-ink-600">
        Already have an account?{" "}
        <Link href={`/login?role=${role}`} className="font-medium text-green-600 underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
