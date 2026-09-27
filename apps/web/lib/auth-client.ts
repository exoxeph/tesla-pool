export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "dtp_token";

export function saveAuthToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable (private mode, storage blocked) — the
    // caller still has the token for this request; it just won't persist.
  }
}

export type AuthError = { error: string };

export async function postAuth<T>(
  path: "/auth/signup" | "/auth/login",
  body: unknown
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data as AuthError | null)?.error ?? "Something went wrong. Try again.";
    throw new Error(message);
  }

  return data as T;
}
