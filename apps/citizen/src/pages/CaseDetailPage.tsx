import { useCallback, useEffect, useState } from "react";
import { Button, Card, Container, Eyebrow, StatusBadge, useAuth } from "@haven/shared";
import { CitizenShell } from "../components/CitizenShell";
import { formatCaseNumber, formatDate, statusLabels, type Complaint, type StatusUpdate } from "../types";
import { UrgencyBadge } from "./MyCasesPage";

type Navigate = (path: string) => void;
type CaseGuidance = { title: string; immediateSteps: string[]; nextSteps: string[]; usefulInformation: string[]; evidenceChecklist: string[]; generatedBy: "gemini" | "api_fallback" };
type CaseDocument = { id: string; kind: string; storage_path: string | null; created_at: string };
type Attachment = { id: string; kind: string; storage_path: string; mime_type: string; size_bytes: number; created_at: string };
type Assignment = { status: string; eta_minutes: number | null; assigned_at: string; teams: { name: string; kind: string; contact_phone: string | null } | null };

export function CaseDetailPage({ caseId, navigate }: { caseId: string; navigate: Navigate }) {
  const { client, session } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [guidance, setGuidance] = useState<CaseGuidance | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => sessionStorage.getItem("haven-case-notice") ?? "");

  const loadCase = useCallback(async () => {
    if (!client || !caseId) return;
    const { data, error: caseError } = await client.from("complaints").select("id,case_number,category_id,track,original_language,original_text,summary,final_urgency,urgency_reason,danger_flags,latitude,longitude,address_text,incident_at,is_anonymous,status,rejection_reason,submitted_at,created_at,updated_at,categories(code,name_en,name_ur,name_sd)").eq("id", caseId).single();
    if (caseError || !data) { setError(caseError?.message ?? "Case not found or access is not allowed."); setLoading(false); return; }
    const loaded = data as unknown as Complaint;
    setComplaint(loaded);

    const [updatesResult, documentsResult, attachmentsResult, assignmentResult] = await Promise.all([
      client.from("status_updates").select("id,status,note,created_at").eq("complaint_id", caseId).order("created_at"),
      client.from("documents").select("id,kind,storage_path,created_at").eq("complaint_id", caseId).order("created_at", { ascending: false }),
      client.from("attachments").select("id,kind,storage_path,mime_type,size_bytes,created_at").eq("complaint_id", caseId).order("created_at"),
      client.from("assignments").select("status,eta_minutes,assigned_at,teams(name,kind,contact_phone)").eq("complaint_id", caseId).not("status", "eq", "cancelled").maybeSingle(),
    ]);
    setUpdates((updatesResult.data ?? []) as StatusUpdate[]);
    setDocuments((documentsResult.data ?? []) as CaseDocument[]);
    setAttachments((attachmentsResult.data ?? []) as Attachment[]);
    setAssignment(assignmentResult.data as unknown as Assignment | null);
    setLoading(false);
  }, [caseId, client]);

  useEffect(() => { void loadCase(); return () => { sessionStorage.removeItem("haven-case-notice"); }; }, [loadCase]);

  useEffect(() => {
    if (!client || !caseId) return;
    const channel = client.channel(`case-${caseId}`).on("postgres_changes", { event: "*", schema: "public", table: "complaints", filter: `id=eq.${caseId}` }, () => { void loadCase(); }).on("postgres_changes", { event: "*", schema: "public", table: "status_updates", filter: `complaint_id=eq.${caseId}` }, () => { void loadCase(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [caseId, client, loadCase]);

  useEffect(() => {
    if (!complaint || !session?.access_token) return;
    let cancelled = false;
    const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
    if (!apiUrl) { setGuidance(localGuidance(complaint.track)); return; }
    void (async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/complaints/${complaint.id}/guidance`, { headers: { authorization: `Bearer ${session.access_token}` } });
        const body = await response.json().catch(() => ({})) as { data?: CaseGuidance };
        if (!response.ok || !body.data) throw new Error("Guidance is unavailable");
        if (!cancelled) setGuidance(body.data);
      } catch {
        if (!cancelled) setGuidance(localGuidance(complaint.track));
      }
    })();
    return () => { cancelled = true; };
  }, [complaint, session?.access_token]);

  async function openPrivateFile(bucket: "complaint-media" | "generated-documents", path: string, id: string) {
    if (!client) return;
    const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
    if (apiUrl && session) {
      const resource = bucket === "complaint-media" ? "attachments" : "documents";
      const response = await fetch(`${apiUrl}/api/v1/files/${resource}/${id}/download-url`, { headers: { authorization: `Bearer ${session.access_token}` } });
      const body = await response.json().catch(() => ({})) as { data?: { signedUrl?: string }; error?: { message?: string } };
      if (!response.ok || !body.data?.signedUrl) return setError(body.error?.message ?? "The private file could not be opened.");
      window.open(body.data.signedUrl, "_blank", "noopener,noreferrer"); return;
    }
    const { data, error: signedError } = await client.storage.from(bucket).createSignedUrl(path, 60);
    if (signedError || !data) return setError(signedError?.message ?? "The private file could not be opened.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (loading) return <CitizenShell navigate={navigate}><div className="case-loading">Loading this protected case…</div></CitizenShell>;
  if (error && !complaint) return <CitizenShell navigate={navigate}><Container as="main" className="case-error-page"><Card padding="large"><Eyebrow>Unable to open case</Eyebrow><h1>We could not show this report.</h1><p>{error}</p><Button variant="dark" onClick={() => navigate("/cases")}>Back to my cases</Button></Card></Container></CitizenShell>;
  if (!complaint) return null;

  return <CitizenShell navigate={navigate}><main className="case-page"><Container><div className="case-back"><button type="button" onClick={() => navigate("/cases")}>← My cases</button><span>Last updated {formatDate(complaint.updated_at)}</span></div>{notice && <div className="case-notice" role="status"><span>{notice}</span><button type="button" onClick={() => { setNotice(""); sessionStorage.removeItem("haven-case-notice"); }}>×</button></div>}{error && <div className="report-error" role="alert">{error}</div>}<section className="case-hero"><div><Eyebrow>{formatCaseNumber(complaint.case_number)}</Eyebrow><h1>{complaint.categories?.name_en ?? "Your report"}</h1><p>{complaint.summary || complaint.original_text}</p><div className="case-badges"><StatusBadge tone="info">{statusLabels[complaint.status]}</StatusBadge><UrgencyBadge urgency={complaint.final_urgency} /><StatusBadge tone="neutral">{complaint.is_anonymous ? "Anonymous view" : "Named report"}</StatusBadge></div></div><div className="case-status-panel"><small>Current status</small><strong>{statusLabels[complaint.status]}</strong><span>{currentStatusMessage(complaint)}</span>{assignment?.eta_minutes && <b>Estimated arrival: {assignment.eta_minutes} minutes</b>}</div></section>

        <div className="case-content-grid"><div className="case-main-column"><Card className="guidance-card safety-guidance" padding="large"><div className="case-section-title"><div><Eyebrow>Recommended actions</Eyebrow><h2>{guidance?.title ?? "Preparing short guidance for your case…"}</h2></div>{complaint.track === "safety" && <a href="tel:15">Call 15 Police</a>}</div>{guidance ? <div className="guidance-sections"><GuidanceList title="Do this now" items={guidance.immediateSteps} /><GuidanceList title="Next steps" items={guidance.nextSteps} /></div> : <GuidanceLoading />}</Card>

          <Card className="guidance-card legal-guidance" padding="large"><Eyebrow>Know your options</Eyebrow><h2>Useful information for this case.</h2>{guidance ? <div className="guidance-sections"><GuidanceList title="In simple words" items={guidance.usefulInformation} /></div> : <GuidanceLoading />}</Card>

          <Card className="guidance-card" padding="large"><Eyebrow>Prepare your case</Eyebrow><h2>Quick evidence checklist.</h2>{guidance ? <div className="guidance-sections"><GuidanceList title="Helpful details" items={guidance.evidenceChecklist} /></div> : <GuidanceLoading />}{documents.length > 0 && <div className="generated-files"><h3>Generated files</h3><div className="document-list">{documents.map((document) => <div key={document.id}><span><b>{document.kind.replaceAll("_", " ")}</b><small>Created {formatDate(document.created_at)}</small></span>{document.storage_path ? <Button size="small" variant="light" onClick={() => void openPrivateFile("generated-documents", document.storage_path!, document.id)}>Open securely</Button> : <StatusBadge tone="warning">Being prepared</StatusBadge>}</div>)}</div></div>}</Card>

          <Card className="guidance-card" padding="large"><Eyebrow>Private evidence</Eyebrow><h2>{attachments.length ? `${attachments.length} attached file${attachments.length === 1 ? "" : "s"}` : "No evidence attached"}</h2>{attachments.length > 0 && <div className="document-list">{attachments.map((attachment) => <div key={attachment.id}><span><b>{attachment.kind}</b><small>{(attachment.size_bytes / 1024 / 1024).toFixed(1)} MB · private</small></span><Button size="small" variant="light" onClick={() => void openPrivateFile("complaint-media", attachment.storage_path, attachment.id)}>Open for 60 seconds</Button></div>)}</div>}</Card></div>

          <aside className="case-side-column"><Card padding="large"><Eyebrow>Case timeline</Eyebrow><h2>What happens next</h2><ol className="case-timeline">{updates.map((update, index) => <li key={update.id} className={index === updates.length - 1 ? "current" : ""}><span /><div><b>{statusLabels[update.status]}</b><p>{update.note || "Case status updated."}</p><small>{formatDate(update.created_at)}</small></div></li>)}</ol></Card><Card tone="sage" padding="large"><Eyebrow>Report details</Eyebrow><dl className="case-facts"><div><dt>Track</dt><dd>{complaint.track === "safety" ? "Safety & justice" : "Civic"}</dd></div><div><dt>Area</dt><dd>{complaint.address_text || "Not provided"}</dd></div><div><dt>Incident</dt><dd>{complaint.incident_at ? formatDate(complaint.incident_at) : "Not provided"}</dd></div><div><dt>Submitted</dt><dd>{formatDate(complaint.submitted_at)}</dd></div></dl></Card>{assignment && <Card tone="sand" padding="large"><Eyebrow>Assigned response</Eyebrow><h2>{assignment.teams?.name ?? "Response team"}</h2><p>Status: {assignment.status.replaceAll("_", " ")}</p>{assignment.teams?.contact_phone && <a className="team-contact" href={`tel:${assignment.teams.contact_phone}`}>Call assigned contact</a>}</Card>}</aside></div>
      </Container></main></CitizenShell>;
}

function GuidanceList({ title, items }: { title: string; items: string[] }) {
  return <section><h3>{title}</h3><ol>{items.map((item) => <li key={item}>{item}</li>)}</ol></section>;
}

function GuidanceLoading() { return <div className="guidance-loading"><span /><span /><span /></div>; }

function localGuidance(track: Complaint["track"]): CaseGuidance {
  const safety = track === "safety";
  return {
    title: safety ? "Simple steps for your safety and follow-up" : "Simple steps to help resolve this report",
    immediateSteps: safety ? ["Move to a safer place if you feel at risk.", "Contact someone you trust and call 15 if danger is immediate."] : ["Keep a safe distance from the reported problem.", "Save the exact location and a short description."],
    nextSteps: ["Keep your Haven case number.", "Add clear supporting details when available.", "Check the timeline for the next update."],
    usefulInformation: ["Your report has been recorded.", "You can follow its progress from this page.", "Clear details help the responsible team understand the problem."],
    evidenceChecklist: ["A short timeline of what happened.", "The location and approximate time.", "Relevant photos or messages you already have."],
    generatedBy: "api_fallback",
  };
}

function currentStatusMessage(complaint: Complaint) {
  if (complaint.status === "rejected") return complaint.rejection_reason ?? "The report was not accepted. Open an appeal if you believe this needs review.";
  if (complaint.status === "closed") return "This case has been closed. Keep the reference number for your records.";
  if (complaint.status === "submitted") return "Your report is waiting for an authorized person to review it.";
  if (complaint.status === "under_review") return "A person is reviewing the information you submitted.";
  if (complaint.status === "accepted") return "The report was accepted. The next action depends on the responsible service.";
  if (complaint.status === "team_assigned") return "A response team or department has been assigned.";
  if (complaint.status === "on_the_way") return "The assigned team has marked itself on the way.";
  if (complaint.status === "arrived") return "The assigned team has marked itself arrived.";
  return "The case has returned to human review.";
}
