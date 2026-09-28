import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Join Dhaka Tesla Pool as a passenger or driver.",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
