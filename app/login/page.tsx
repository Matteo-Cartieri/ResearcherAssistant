"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false, 
    });

    setLoading(false);

    if (res?.error) {
      setError("Email o password non validi.");
      return;
    }

    window.location.href = callbackUrl;
  };

  return (
    <main className="h-screen flex items-center justify-center bg-neutral-950">
      <form
        onSubmit={handleLogin}
        className="flex flex-col gap-3 p-6 rounded-xl border border-neutral-800 bg-neutral-900 w-80"
      >
        <h1 className="text-lg font-semibold text-neutral-200">Accedi</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 rounded-md bg-neutral-800 text-neutral-100 text-sm"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 rounded-md bg-neutral-800 text-neutral-100 text-sm"
          required
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="p-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
        <p className="text-xs text-neutral-400 text-center mt-1">
          Non hai un account?{" "}
          <Link href="/signup" className="text-blue-400 hover:underline">
            Registrati
          </Link>
        </p>
      </form>
    </main>
  );
}