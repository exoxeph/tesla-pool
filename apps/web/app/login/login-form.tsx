"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { postAuth, saveAuthToken } from "@/lib/auth-client";
import { isValidPhone } from "@/lib/validation";

type LoginResponse = {
  token: string;
  user: { id: string; name: string; phone: string; role: string };
};

type FieldErrors = Partial<Record<"phone" | "password", string>>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "driver" ? "driver" : "passenger";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!isValidPhone(phone)) {
      errors.phone = "Enter a valid Bangladeshi phone number.";
    }
    if (!password) {
      errors.password = "Password is required.";
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
      const data = await postAuth<LoginResponse>("/auth/login", {
        phone,
        password,
      });
      saveAuthToken(data.token);
      router.push(data.user.role === "DRIVER" ? "/driver/dashboard" : "/dashboard");
    } catch (err) {
      // A wrong phone/password combo is a server-verified fact (not a
      // format problem), so it surfaces here rather than as a field error.
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
          {role === "driver" ? "Driver login" : "Passenger login"}
        </h1>
        <p className="mt-2 font-sans text-base text-ink-600">
          {role === "driver"
            ? "Log in to manage your Tesla and its pool."
            : "Log in to pool a ride across Dhaka."}
        </p>
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
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={
              "rounded-md border bg-surface px-3 py-2 font-sans text-base text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 " +
              (fieldErrors.password ? "border-danger-600" : "border-border")
            }
          />
          {fieldErrors.password ? (
            <p id="password-error" className="font-sans text-xs text-danger-600">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="sticker-card -rotate-1 inline-flex items-center justify-center border-4 border-green-500 bg-surface-card px-6 py-3 font-display text-xl uppercase tracking-wide text-ink-900 transition-transform hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="font-sans text-sm text-ink-600">
        {role === "driver" ? "New driver?" : "New passenger?"}{" "}
        <Link
          href={`/signup?role=${role}`}
          className="font-medium text-green-600 underline"
        >
          Create an account
        </Link>
      </p>
    </main>
  );
}
