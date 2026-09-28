"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { postAuth, saveAuthToken } from "@/lib/auth-client";
import { isValidPhone } from "@/lib/validation";
import { AuthShell } from "@/components/auth-shell";
import { ArrowRight } from "@/components/icons";

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
    <AuthShell
      title={role === "driver" ? "Driver login" : "Welcome back"}
      description={role === "driver" ? "Sign in to manage your registered vehicle and availability." : "Sign in to access your early passenger account and future route tools."}
    >
      <div className="mb-7 grid grid-cols-2 rounded-full bg-surface-muted p-1" aria-label="Login type">
        <Link href="/login?role=passenger" className={`focus-ring rounded-full px-4 py-2.5 text-center text-sm font-medium transition ${role === "passenger" ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>Passenger</Link>
        <Link href="/login?role=driver" className={`focus-ring rounded-full px-4 py-2.5 text-center text-sm font-medium transition ${role === "driver" ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>Driver</Link>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-danger-600/30 bg-danger-50 px-4 py-3 text-sm text-danger-600"
          >
            {formError}
          </p>
        ) : null}

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
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`field ${fieldErrors.password ? "field-error" : ""}`}
          />
          {fieldErrors.password ? (
            <p id="password-error" className="text-xs text-danger-600">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-forest-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Logging in..." : <>Log in <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        {role === "driver" ? "New driver?" : "New passenger?"}{" "}
        <Link
          href={`/signup?role=${role}`}
          className="font-semibold text-forest-700 underline decoration-lime-400 decoration-2 underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
