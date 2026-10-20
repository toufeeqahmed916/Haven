import { useState, type FormEvent } from "react";
import { Button, Card, Container, Eyebrow, Field, SelectField, useAuth } from "@haven/shared";
import { CitizenShell } from "../components/CitizenShell";

type Navigate = (path: string) => void;

export function SettingsPage({ navigate }: { navigate: Navigate }) {
  const { session, updateProfile } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const metadata = session?.user.user_metadata ?? {};

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const data = new FormData(event.currentTarget);
    const result = await updateProfile({
      displayName: String(data.get("displayName") ?? ""),
      language: String(data.get("language") ?? "en") as "en" | "ur" | "sd",
      phone: String(data.get("phone") ?? ""),
    });
    setBusy(false);
    if (result.error) setError(result.error); else setMessage("Your preferences were saved.");
  }

  return <CitizenShell navigate={navigate}><Container as="main" className="settings-main"><Card padding="large" className="settings-card"><Eyebrow>Language and settings</Eyebrow><h1>Your preferences</h1><p>Choose how Haven should address you. In-app case notifications are active; phone OTP remains optional because it requires a configured SMS provider.</p>{error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="auth-success" role="status">{message}</div>}<form onSubmit={save}><Field label="Your name" name="displayName" required minLength={2} defaultValue={String(metadata.display_name ?? "")} /><SelectField label="Preferred language" name="language" defaultValue={String(metadata.language ?? "en")}><option value="en">English</option><option value="ur">اردو — Urdu</option><option value="sd">سنڌي — Sindhi</option></SelectField><Field label="Phone number (optional)" name="phone" type="tel" defaultValue={String(metadata.phone_pending ?? "")} hint="Saved for future contact setup; not used for login or SMS yet." /><Button type="submit" variant="dark" disabled={busy}>{busy ? "Saving…" : "Save preferences"}</Button></form></Card></Container></CitizenShell>;
}
