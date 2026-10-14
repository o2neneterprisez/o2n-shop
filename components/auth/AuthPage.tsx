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

function normalizePhoneNumber(value: string) {
  const phone = value.trim().replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(phone)) return `+91${phone}`;
  if (/^\+?[1-9]\d{7,14}$/.test(phone)) return phone.startsWith("+") ? phone : `+${phone}`;
  return null;
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPhonePurpose, setPendingPhonePurpose] = useState<"signup" | "password-reset" | null>(null);
  const [phoneOtp, setPhoneOtp] = useState("");
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

    if (mode === "signup" && !normalizePhoneNumber(phone)) {
      setError("Enter a valid mobile number with country code, or a 10-digit Indian mobile number.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (pendingPhone) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          phone: pendingPhone,
          token: phoneOtp.trim(),
          type: "sms",
        });
        if (verifyError) throw verifyError;

        dispatch(setAuthUser(authUserFromSupabase(data.user)));
        setPendingPhone(null);
        setPendingPhonePurpose(null);
        if (pendingPhonePurpose === "password-reset") {
          router.replace("/auth/update-password");
          router.refresh();
          return;
        }
        if (pendingPhonePurpose === "signup" && pendingEmail) {
          const { error: emailError } = await supabase.auth.updateUser(
            { email: pendingEmail },
            { emailRedirectTo: `${window.location.origin}/auth/login` }
          );
          if (emailError) {
            throw new Error(`Your phone is verified, but the email could not be linked: ${emailError.message}`);
          }
          setMessage("Mobile verified. Check your email to confirm and link it to your account. You can sign in with your mobile number meanwhile.");
          return;
        }

        router.replace("/");
        router.refresh();
        return;
      }

      if (mode === "login") {
        const identifier = loginIdentifier.trim();
        const credentials = identifier.includes("@")
          ? { email: identifier, password }
          : { phone: normalizePhoneNumber(identifier) ?? identifier, password };
        const { data, error: authError } = await supabase.auth.signInWithPassword(credentials);
        if (authError) throw authError;
        dispatch(setAuthUser(authUserFromSupabase(data.user)));
        router.replace("/");
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const normalizedPhone = normalizePhoneNumber(phone);
        if (!normalizedPhone) throw new Error("Enter a valid mobile number.");
        const { data, error: authError } = await supabase.auth.signUp({
          phone: normalizedPhone,
          password,
          options: {
            channel: "sms",
            data: {
              full_name: fullName.trim(),
              ...(email.trim() ? { contact_email: email.trim() } : {}),
            },
          },
        });
        if (authError) throw authError;
        if (!data.user) throw new Error("The account was not created. Please try again.");
        setPendingPhone(normalizedPhone);
        setPendingEmail(email.trim());
        setPendingPhonePurpose("signup");
        setMessage(`Enter the verification code sent to ${normalizedPhone}.`);
        return;
      }

      if (mode === "forgot-password") {
        if (email.trim().includes("@")) {
          const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/auth/update-password`,
          });
          if (authError) throw authError;
          setMessage("If an account exists for that email, we’ve sent a password reset link.");
        } else {
          const normalizedPhone = normalizePhoneNumber(email);
          if (!normalizedPhone) throw new Error("Enter a valid email address or mobile number.");
          const { error: authError } = await supabase.auth.signInWithOtp({
            phone: normalizedPhone,
            options: { shouldCreateUser: false, channel: "sms" },
          });
          if (authError) throw authError;
          setPendingPhone(normalizedPhone);
          setPendingPhonePurpose("password-reset");
          setMessage(`Enter the verification code sent to ${normalizedPhone} to reset your password.`);
        }
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
      <MarketplaceHeader>
        <Link className="category-back" href="/">← Back to shop</Link>
      </MarketplaceHeader>
      <main className="auth-main">
        <section className="auth-card">
          <span className="category-pill">O2N E-MALL</span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && !pendingPhone ? (
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

            {mode === "signup" && !pendingPhone ? (
              <label>
                Mobile number
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  required
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
                <small className="auth-field-hint">You’ll verify this number and can use it to sign in.</small>
              </label>
            ) : null}

            {mode === "signup" && !pendingPhone ? (
              <label>
                Email address <span className="auth-optional">(Optional)</span>
                <input
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <small className="auth-field-hint">Confirm it by email to use it as another sign-in method.</small>
              </label>
            ) : null}

            {mode === "login" ? (
              <label>
                Email address or mobile number
                <input
                  autoComplete="username"
                  required
                  type="text"
                  value={loginIdentifier}
                  onChange={(event) => setLoginIdentifier(event.target.value)}
                />
              </label>
            ) : null}

            {mode === "forgot-password" && !pendingPhone ? (
              <label>
                Email address or mobile number
                <input
                  autoComplete="username"
                  required
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            ) : null}

            {!pendingPhone && (passwordMode || mode === "update-password") ? (
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

            {!pendingPhone && (mode === "signup" || mode === "update-password") ? (
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

            {pendingPhone ? (
              <label>
                SMS verification code
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  required
                  type="text"
                  value={phoneOtp}
                  onChange={(event) => setPhoneOtp(event.target.value)}
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
                : pendingPhone
                  ? "Verify mobile number"
                  : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot-password"
                      ? pendingPhone
                        ? "Verify mobile number"
                        : "Send reset link"
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
