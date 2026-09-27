"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { postAuth, saveAuthToken } from "@/lib/auth-client";

type SignupResponse = {
  token: string;
  user: { id: string; name: string; phone: string; role: string };
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await postAuth<SignupResponse>("/auth/signup", {
        name,
        phone,
        password,
      });
      saveAuthToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-14 sm:py-20">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-wide text-ink-900">
          Passenger signup
        </h1>
        <p className="mt-2 font-sans text-base text-ink-600">
          Create an account to start pooling rides across Dhaka.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5 rounded-lg border border-border bg-surface-card p-6"
      >
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-danger-600 bg-danger-50 px-3 py-2 text-sm text-danger-600"
          >
            {error}
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
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 font-sans text-base text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          />
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
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 font-sans text-base text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          />
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
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 font-sans text-base text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          />
          <p className="font-sans text-xs text-ink-600">At least 8 characters.</p>
        </div>

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
        <Link href="/login?role=passenger" className="font-medium text-green-600 underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
