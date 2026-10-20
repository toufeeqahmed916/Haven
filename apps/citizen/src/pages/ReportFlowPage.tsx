import { useEffect, useMemo, useState } from "react";
import { Button, Card, Container, Eyebrow, Field, SelectField, StatusBadge, TextAreaField, useAuth } from "@haven/shared";
import { CitizenShell } from "../components/CitizenShell";
import type { Category, LanguageCode } from "../types";

type Navigate = (path: string) => void;
type ReportDraft = {
  category: string;
  details: string;
  area: string;
  incidentAt: string;
  latitude: number | null;
  longitude: number | null;
  isAnonymous: boolean;
};

const emptyDraft: ReportDraft = { category: "", details: "", area: "", incidentAt: "", latitude: null, longitude: null, isAnonymous: false };
const stepLabels = ["Describe", "Details", "Privacy", "Review"];

function savedDraft(): ReportDraft {
  try {
    const value = JSON.parse(sessionStorage.getItem("haven-report-draft") ?? "null") as Partial<ReportDraft> | null;
    return { ...emptyDraft, ...value, isAnonymous: Boolean(value?.isAnonymous) };
  } catch {
    return emptyDraft;
  }
}

export function ReportFlowPage({ navigate }: { navigate: Navigate }) {
  const { client, session } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ReportDraft>(savedDraft);
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    sessionStorage.setItem("haven-report-draft", JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!client) return;
    client.from("categories").select("id,code,name_en,name_ur,name_sd,track").eq("is_active", true).order("sort_order").then(({ data, error: queryError }) => {
      setCategories((data ?? []) as Category[]);
      setError(queryError?.message ?? "");
      setLoadingCategories(false);
    });
  }, [client]);

  const selectedCategory = useMemo(() => categories.find((category) => category.code === draft.category), [categories, draft.category]);
  const language = (session?.user.user_metadata.language ?? "en") as LanguageCode;
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

  async function submitThroughApprovedPath(payload: { categoryCode: string; text: string; language: LanguageCode; isAnonymous: boolean; latitude: number | null; longitude: number | null; addressText: string | null; incidentAt: string | null }) {
    if (!client || !session) throw new Error("Your secure session is not ready.");
    if (apiUrl) {
      const response = await fetch(`${apiUrl}/api/v1/complaints`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...payload, submit: true }) });
      const body = await response.json().catch(() => ({})) as { data?: { complaintId?: string }; error?: { message?: string } };
      if (!response.ok || !body.data?.complaintId) throw new Error(body.error?.message ?? "The report could not be submitted.");
      return body.data.complaintId;
    }
    const result = await client.rpc("submit_complaint", { p_category_code: payload.categoryCode, p_original_text: payload.text, p_original_language: payload.language, p_is_anonymous: payload.isAnonymous, p_latitude: payload.latitude, p_longitude: payload.longitude, p_address_text: payload.addressText, p_incident_at: payload.incidentAt });
    if (result.error || !result.data) throw new Error(result.error?.message ?? "The report could not be submitted.");
    return String(result.data);
  }

  function update<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function continueFromDescribe() {
    if (draft.details.trim().length < 10) return setError("Please describe what happened using at least 10 characters.");
    setError(""); setStep(1);
  }

  function continueFromDetails() {
    if (!draft.category) return setError("Please choose the category that best matches the problem.");
    setError(""); setStep(2);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const tooLarge = incoming.find((file) => file.size > 50 * 1024 * 1024);
    if (tooLarge) return setError(`${tooLarge.name} is larger than the 50 MB limit.`);
    setError("");
    setFiles((current) => [...current, ...incoming].slice(0, 5));
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) return setError("Location is not supported by this browser. You can type the area manually.");
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude }));
        setLocating(false);
      },
      () => { setError("Location permission was not available. You can continue with a typed area."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function submitComplaint() {
    if (!client || !session || !selectedCategory) return setError("Your session or category is not ready. Please reload and try again.");
    setSubmitting(true); setError("");
    let complaintId: string;
    try { complaintId = await submitThroughApprovedPath({ categoryCode: selectedCategory.code, text: draft.details.trim(), language, isAnonymous: draft.isAnonymous, latitude: draft.latitude, longitude: draft.longitude, addressText: draft.area.trim() || null, incidentAt: draft.incidentAt ? new Date(draft.incidentAt).toISOString() : null }); }
    catch (caught) { setSubmitting(false); return setError(caught instanceof Error ? caught.message : "The report could not be submitted."); }
    const failedUploads: string[] = [];
    for (const file of files) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${session.user.id}/${complaintId}/${crypto.randomUUID()}-${cleanName}`;
      const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "other";
      if (apiUrl) {
        try {
          const signedResponse = await fetch(`${apiUrl}/api/v1/files/complaints/${complaintId}/attachments/upload-url`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, kind }) });
          const signedBody = await signedResponse.json() as { data?: { path: string; token: string }; error?: { message?: string } }; if (!signedResponse.ok || !signedBody.data) throw new Error(signedBody.error?.message ?? "Upload permission was not created.");
          const upload = await client.storage.from("complaint-media").uploadToSignedUrl(signedBody.data.path, signedBody.data.token, file, { contentType: file.type }); if (upload.error) throw upload.error;
          const complete = await fetch(`${apiUrl}/api/v1/files/complaints/${complaintId}/attachments/complete`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ storagePath: signedBody.data.path, fileName: file.name, mimeType: file.type, sizeBytes: file.size, kind }) }); if (!complete.ok) { const completeBody = await complete.json().catch(() => ({})) as { error?: { message?: string } }; throw new Error(completeBody.error?.message ?? "Upload could not be confirmed."); }
          continue;
        } catch { failedUploads.push(file.name); continue; }
      }
      const { error: uploadError } = await client.storage.from("complaint-media").upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) { failedUploads.push(file.name); continue; }
      const { error: recordError } = await client.from("attachments").insert({ complaint_id: complaintId, uploaded_by: session.user.id, kind, storage_path: storagePath, mime_type: file.type || "application/octet-stream", size_bytes: file.size });
      if (recordError) failedUploads.push(file.name);
    }

    sessionStorage.removeItem("haven-report-draft");
    if (failedUploads.length) sessionStorage.setItem("haven-case-notice", `The report was submitted, but these files need to be added again: ${failedUploads.join(", ")}`);
    setSubmitting(false);
    navigate(`/case/${complaintId}`);
  }

  async function sendQuickAlert() {
    if (!client || !session || !window.confirm("Send a High-priority quick alert for human review? This does not replace calling emergency services.")) return;
    setSubmitting(true); setError("");
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000, enableHighAccuracy: true }));
        latitude = position.coords.latitude; longitude = position.coords.longitude;
      } catch { /* Location is optional; the alert still goes to human review. */ }
    }
    try { const complaintId = await submitThroughApprovedPath({ categoryCode: "other_safety", text: "I am in danger and need help now. Quick alert sent from Haven.", language, isAnonymous: false, latitude, longitude, addressText: null, incidentAt: new Date().toISOString() }); setSubmitting(false); navigate(`/case/${complaintId}`); }
    catch (caught) { setSubmitting(false); setError(caught instanceof Error ? caught.message : "The quick alert could not be sent. Call emergency services directly."); }
  }

  return <CitizenShell navigate={navigate}><main className="report-page"><Container><div className="report-topbar"><button type="button" onClick={() => navigate("/app")}>← Back to your Haven</button><span>Draft saved in this browser</span></div><div className="report-heading"><div><Eyebrow>Report a problem</Eyebrow><h1>Start with what you know.</h1><p>You can review every detail before it is submitted for human review.</p></div><button className="danger-shortcut" type="button" disabled={submitting} onClick={sendQuickAlert}><b>I am in danger right now</b><span>Send a quick alert with available location</span></button></div><ol className="report-progress" aria-label="Report progress">{stepLabels.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "complete" : ""}><span>{index < step ? "✓" : index + 1}</span>{label}</li>)}</ol>{error && <div className="report-error" role="alert">{error}</div>}

        {step === 0 && <Card className="report-card" padding="large"><div className="report-card-head"><div><Eyebrow>01 · Describe</Eyebrow><h2>What happened?</h2><p>Use your own words. Formal or legal language is not required.</p></div><StatusBadge tone="info">Private draft</StatusBadge></div><TextAreaField label="Tell us about the problem" value={draft.details} onChange={(event) => update("details", event.target.value)} placeholder="Describe what happened, who was involved, and what you need help with." minLength={10} maxLength={10000} required hint={`${draft.details.length}/10,000 characters`} /><div className="media-box"><div><b>Add evidence if it is safe</b><span>Up to 5 images, audio clips, or videos. Maximum 50 MB each.</span></div><label className="media-picker">Choose files<input type="file" multiple accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/webm,video/mp4,video/webm" onChange={(event) => addFiles(event.target.files)} /></label></div>{files.length > 0 && <ul className="file-list">{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}<small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>×</button></li>)}</ul>}<div className="report-actions"><Button variant="dark" onClick={continueFromDescribe}>Continue <span>→</span></Button></div></Card>}

        {step === 1 && <Card className="report-card" padding="large"><Eyebrow>02 · Details</Eyebrow><h2>Help us route it correctly.</h2><p>Choose the closest category. A person can correct it during review.</p><SelectField label="Problem category" value={draft.category} onChange={(event) => update("category", event.target.value)} disabled={loadingCategories} required><option value="">{loadingCategories ? "Loading categories…" : "Choose a category"}</option><optgroup label="Safety and justice">{categories.filter((item) => item.track === "safety").map((item) => <option key={item.id} value={item.code}>{item.name_en}</option>)}</optgroup><optgroup label="Civic problems">{categories.filter((item) => item.track === "civic").map((item) => <option key={item.id} value={item.code}>{item.name_en}</option>)}</optgroup></SelectField><Field label="Area or city" value={draft.area} onChange={(event) => update("area", event.target.value)} placeholder="e.g. Gulshan, Karachi" hint="You can type the location, share GPS, or use both." /><div className="location-row"><Button variant="light" onClick={useCurrentLocation} disabled={locating}>{locating ? "Getting location…" : draft.latitude ? "✓ Location added" : "Use my current location"}</Button>{draft.latitude && <button type="button" onClick={() => setDraft((current) => ({ ...current, latitude: null, longitude: null }))}>Remove GPS</button>}</div><Field label="When did it happen? (optional)" type="datetime-local" value={draft.incidentAt} onChange={(event) => update("incidentAt", event.target.value)} /><div className="report-actions split"><Button variant="light" onClick={() => setStep(0)}>← Back</Button><Button variant="dark" onClick={continueFromDetails}>Continue →</Button></div></Card>}

        {step === 2 && <Card className="report-card" padding="large"><Eyebrow>03 · Privacy</Eyebrow><h2>Choose how your identity appears.</h2><p>Your account remains verified internally. Anonymous mode hides your identity from public/general views, but authorized senior staff may access it when necessary to act.</p><div className="privacy-choices"><label className={!draft.isAnonymous ? "selected" : ""}><input type="radio" name="privacy" checked={!draft.isAnonymous} onChange={() => update("isAnonymous", false)} /><span><b>Use my name</b><small>Authorized case reviewers can connect the report to your profile.</small></span></label><label className={draft.isAnonymous ? "selected" : ""}><input type="radio" name="privacy" checked={draft.isAnonymous} onChange={() => update("isAnonymous", true)} /><span><b>Anonymous to public/general staff</b><small>Your verified identity stays protected behind restricted access.</small></span></label></div><div className="privacy-explainer"><b>Before you continue</b><span>Haven stores only the details needed for your report. Uploaded media stays in a private bucket. Do not upload evidence if collecting it could put you at risk.</span></div><div className="report-actions split"><Button variant="light" onClick={() => setStep(1)}>← Back</Button><Button variant="dark" onClick={() => { setError(""); setStep(3); }}>Review report →</Button></div></Card>}

        {step === 3 && <Card className="report-card review-card" padding="large"><div className="report-card-head"><div><Eyebrow>04 · Review</Eyebrow><h2>Check before submitting.</h2><p>After submission, the report enters the human-review queue.</p></div><StatusBadge tone={selectedCategory?.track === "safety" ? "warning" : "info"}>{selectedCategory?.track === "safety" ? "Safety & justice" : "Civic"}</StatusBadge></div><dl className="review-list"><div><dt>Category</dt><dd>{selectedCategory?.name_en}</dd></div><div><dt>Your report</dt><dd>{draft.details}</dd></div><div><dt>Location</dt><dd>{draft.area || "No typed area"}{draft.latitude ? " · GPS added" : ""}</dd></div><div><dt>Incident time</dt><dd>{draft.incidentAt ? new Date(draft.incidentAt).toLocaleString() : "Not provided"}</dd></div><div><dt>Privacy</dt><dd>{draft.isAnonymous ? "Anonymous to public/general staff" : "Named report"}</dd></div><div><dt>Evidence</dt><dd>{files.length ? `${files.length} private file(s)` : "No files"}</dd></div></dl><label className="submission-confirm"><input type="checkbox" required id="truth-confirm" /><span>I confirm this report is accurate to the best of my knowledge. I understand false complaints may be reviewed and can lead to account action.</span></label><div className="submission-note"><b>AI suggests. Humans decide.</b><span>Initial danger rules may raise priority, but an authorized person reviews the case and decides the next action.</span></div><div className="report-actions split"><Button variant="light" onClick={() => setStep(2)}>← Back</Button><Button variant="dark" disabled={submitting} onClick={() => { const checkbox = document.getElementById("truth-confirm") as HTMLInputElement | null; if (!checkbox?.checked) return setError("Please confirm the accuracy statement before submitting."); void submitComplaint(); }}>{submitting ? "Submitting securely…" : "Submit for human review"}</Button></div></Card>}
      </Container></main></CitizenShell>;
}
