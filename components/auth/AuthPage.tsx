"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { authUserFromSupabase, setAuthUser } from "@/lib/store/authSlice";
import { useAppDispatch } from "@/lib/store/hooks";

export type AuthMode = "login" | "signup" | "forgot-password" | "update-password";

const authCopy: Record<AuthMode, { title: string; description: string }> = {
  login: { title: "Welcome back", description: "Sign in to your O2N account." },
  signup: { title: "Create your account", description: "Join O2N and discover local shops." },
  "forgot-password": { title: "Reset your password", description: "We’ll email you a link to choose a new password." },
  "update-password": { title: "Choose a new password", description: "Use a strong password you haven’t used before." },
};

export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { title, description } = authCopy[mode];
  const passwordMode = mode === "login" || mode === "signup";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase || !isSupabaseConfigured) {
      setError("Authentication is not configured. Set the Supabase URL and public anon key to enable accounts.");
      return;
    }

    if ((mode === "signup" || mode === "update-password") && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        dispatch(setAuthUser(authUserFromSupabase(data.user)));
        router.replace("/");
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/login`,
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (authError) throw authError;
        if (!data.user) throw new Error("The account was not created. Please try again.");
        if (data.session) {
          dispatch(setAuthUser(authUserFromSupabase(data.user)));
          router.replace("/");
          router.refresh();
          return;
        }
        setMessage("Your account was created. Check your email for a confirmation link before signing in.");
        return;
      }

      if (mode === "forgot-password") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (authError) throw authError;
        setMessage("If an account exists for that email, we’ve sent a password reset link.");
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;
      setMessage("Your password has been updated. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication could not be completed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <MarketplaceHeader />
      <main className="auth-main">
        <section className="auth-card">
          <span className="category-pill">O2N E-MALL</span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label>
                Full name
                <input
                  autoComplete="name"
                  required
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
            ) : null}

            {mode === "signup" ? (
              <label>
                Email address
                <input
                  autoComplete="email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            ) : null}

            {mode === "login" ? (
              <label>
                Email address
                <input
                  autoComplete="email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            ) : null}

            {mode === "forgot-password" ? (
              <label>
                Email address
                <input
                  autoComplete="email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            ) : null}

            {(passwordMode || mode === "update-password") ? (
              <label>
                Password
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            ) : null}

            {(mode === "signup" || mode === "update-password") ? (
              <label>
                Confirm password
                <input
                  autoComplete="new-password"
                  minLength={8}
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            ) : null}

            {mode === "login" ? (
              <Link className="auth-inline-link auth-forgot-link" href="/auth/forgot-password">
                Forgot password?
              </Link>
            ) : null}

            {error ? <p className="auth-message auth-error" role="alert">{error}</p> : null}
            {message ? <p className="auth-message auth-success" role="status">{message}</p> : null}

            <button className="btn primary auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot-password"
                      ? "Send reset link"
                      : "Update password"}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "login" ? (
              <>New to O2N? <Link className="auth-inline-link" href="/auth/signup">Create an account</Link></>
            ) : mode === "signup" ? (
              <>Already have an account? <Link className="auth-inline-link" href="/auth/login">Sign in</Link></>
            ) : mode === "forgot-password" ? (
              <Link className="auth-inline-link" href="/auth/login">Back to sign in</Link>
            ) : (
              <Link className="auth-inline-link" href="/auth/login">Go to sign in</Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
