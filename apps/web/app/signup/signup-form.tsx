"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { postAuth, saveAuthRole, saveAuthToken } from "@/lib/auth-client";
import { isValidPhone } from "@/lib/validation";
import { SeatPicker } from "@/components/seat-picker";
import { AuthShell } from "@/components/auth-shell";
import { ArrowRight, Car, Users } from "@/components/icons";

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
        saveAuthRole(data.user.role);
        router.push("/dashboard");
      } else {
        const data = await postAuth<DriverSignupResponse>(
          "/auth/driver-signup",
          { name, phone, password, vehicleLabel, capacity }
        );
        saveAuthToken(data.token);
        saveAuthRole(data.user.role);
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
    <AuthShell title="Join the pool" description="Create your account, choose your side of the journey, and get moving.">
      <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={role === "passenger"}
          onClick={() => setRole("passenger")}
          className={
            "focus-ring flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition " +
            (role === "passenger"
              ? "border-forest-800 bg-forest-800 text-white shadow-card"
              : "border-line bg-white text-ink-500")
          }
        >
          <Users className={`h-4 w-4 ${role === "passenger" ? "text-lime-300" : ""}`} /> Passenger
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={role === "driver"}
          onClick={() => setRole("driver")}
          className={
            "focus-ring flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition " +
            (role === "driver"
              ? "border-forest-800 bg-forest-800 text-white shadow-card"
              : "border-line bg-white text-ink-500")
          }
        >
          <Car className={`h-4 w-4 ${role === "driver" ? "text-lime-300" : ""}`} /> Driver
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-7 flex flex-col gap-5"
      >
        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-danger-600/30 bg-danger-50 px-4 py-3 text-sm text-danger-600"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-ink-900">
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
            className={`field ${fieldErrors.name ? "field-error" : ""}`}
          />
          {fieldErrors.name ? (
            <p id="name-error" className="text-xs text-danger-600">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-ink-900">
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
            className={`field ${fieldErrors.phone ? "field-error" : ""}`}
          />
          {fieldErrors.phone ? (
            <p id="phone-error" className="text-xs text-danger-600">
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink-900">
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
            className={`field ${fieldErrors.password ? "field-error" : ""}`}
          />
          <p
            id="password-hint"
            className={
              "text-xs " +
              (fieldErrors.password ? "text-danger-600" : "text-ink-500")
            }
          >
            {fieldErrors.password ?? "At least 8 characters."}
          </p>
        </div>

        {role === "driver" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vehicleLabel" className="text-sm font-medium text-ink-900">
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
                className={`field ${fieldErrors.vehicleLabel ? "field-error" : ""}`}
              />
              {fieldErrors.vehicleLabel ? (
                <p id="vehicle-error" className="text-xs text-danger-600">
                  {fieldErrors.vehicleLabel}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-900">
                Seat capacity
              </span>
              <SeatPicker value={capacity} onChange={setCapacity} />
            </div>
          </>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-forest-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href={`/login?role=${role}`} className="font-semibold text-forest-700 underline decoration-lime-400 decoration-2 underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
