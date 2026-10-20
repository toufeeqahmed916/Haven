import { useEffect, useState, type FormEvent } from "react";
import { Brand, Button, Card, Eyebrow, Field, LinkButton, SelectField, useAuth } from "@haven/shared";

type Navigate = (path: string) => void;

export function AuthPage({ mode, navigate }: { mode: "login" | "signup"; navigate: Navigate }) {
  const { session, signIn, signUp, isConfigured } = useAuth();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate("/app");
  }, [navigate, session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");

    if (mode === "login") {
      const result = await signIn(email, password);
      setBusy(false);
      if (result.error) setError(result.error);
      else navigate("/app");
      return;
    }

    const confirmPassword = String(values.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setBusy(false);
      setError("The two passwords do not match.");
      return;
    }

    const result = await signUp(email, password, {
      displayName: String(values.get("displayName") ?? ""),
      language: String(values.get("language") ?? "en") as "en" | "ur" | "sd",
      phone: String(values.get("phone") ?? ""),
    });
    setBusy(false);
    if (result.error) setError(result.error);
    else if (result.needsEmailConfirmation) setNotice("Check your email and confirm your account, then return to sign in.");
    else navigate("/app");
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Haven account introduction">
      <Brand className="auth-brand-link" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }} />
        <div className="auth-story-copy">
          <Eyebrow tone="dark">A safer way to ask for help</Eyebrow>
          <h1>{mode === "login" ? "Welcome back to Haven." : "Start with one clear step."}</h1>
          <p>{mode === "login" ? "Sign in to continue a draft and follow your reports." : "Create a private account to save a report and receive status updates."}</p>
          <div className="auth-promise"><span>✓</span><div><b>Your information stays protected</b><small>Database access is restricted by your signed-in identity.</small></div></div>
          <div className="auth-promise"><span>✓</span><div><b>Humans make final decisions</b><small>AI suggestions never replace control-room review.</small></div></div>
        </div>
        <p className="auth-emergency-copy">In immediate danger, call Police at <a href="tel:15">15</a>.</p>
      </section>

      <section className="auth-form-side">
        <Card className="auth-card" padding="large">
          <Eyebrow>{mode === "login" ? "Secure sign in" : "Create your account"}</Eyebrow>
          <h2>{mode === "login" ? "Continue to Haven" : "Tell us how to support you"}</h2>
          <p className="auth-intro">{mode === "login" ? "Use the email connected to your Haven account." : "Email login is free for the university demo. Phone OTP can be added later."}</p>

          {!isConfigured && <div className="auth-config-message" role="status"><b>Supabase connection needed</b><span>Copy `.env.example` to `.env` and add your Project URL and anon key.</span></div>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          {notice && <div className="auth-success" role="status">{notice}</div>}

          <form onSubmit={submit}>
            {mode === "signup" && <Field label="Your name" name="displayName" autoComplete="name" required minLength={2} placeholder="How should we address you?" />}
            <Field label="Email address" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            {mode === "signup" && <Field label="Phone number (optional)" name="phone" type="tel" autoComplete="tel" placeholder="e.g. +92 300 1234567" hint="Saved only as preparation. Phone OTP is not enabled yet." />}
            {mode === "signup" && <SelectField label="Preferred language" name="language" defaultValue="en"><option value="en">English</option><option value="ur">اردو — Urdu</option><option value="sd">سنڌي — Sindhi</option></SelectField>}
            <Field label="Password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} placeholder="At least 8 characters" />
            {mode === "signup" && <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} placeholder="Repeat your password" />}
            {mode === "signup" && <label className="auth-consent"><input type="checkbox" name="consent" required /><span>I understand Haven is not an emergency service and does not guarantee a response.</span></label>}
            <Button variant="dark" fullWidth type="submit" disabled={busy || !isConfigured}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <span aria-hidden="true">↗</span></Button>
          </form>

          <div className="auth-switch">
            {mode === "login" ? "New to Haven?" : "Already have an account?"}
            <a href={mode === "login" ? "/signup" : "/login"} onClick={(event) => { event.preventDefault(); navigate(mode === "login" ? "/signup" : "/login"); }}>{mode === "login" ? "Create an account" : "Sign in"}</a>
          </div>
          <LinkButton className="auth-home-link" variant="light" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Back to Haven</LinkButton>
        </Card>
      </section>
    </main>
  );
}
