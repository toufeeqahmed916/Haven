import { useCallback, useEffect, useState } from "react";
import { Button, Card, Container, Eyebrow, StatusBadge, useAuth } from "@haven/shared";
import { CitizenShell } from "../components/CitizenShell";
import { formatCaseNumber, formatDate, statusLabels, type Complaint, type Urgency } from "../types";

type Navigate = (path: string) => void;

export function MyCasesPage({ navigate }: { navigate: Navigate }) {
  const { client, session } = useAuth();
  const [cases, setCases] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCases = useCallback(async () => {
    if (!client) return;
    const { data, error: queryError } = await client.from("complaints").select("id,case_number,category_id,track,original_language,original_text,summary,final_urgency,urgency_reason,danger_flags,latitude,longitude,address_text,incident_at,is_anonymous,status,rejection_reason,submitted_at,created_at,updated_at,categories(code,name_en,name_ur,name_sd)").order("created_at", { ascending: false });
    setCases((data ?? []) as unknown as Complaint[]);
    setError(queryError?.message ?? "");
    setLoading(false);
  }, [client]);

  useEffect(() => { void loadCases(); }, [loadCases]);

  useEffect(() => {
    if (!client || !session) return;
    const channel = client.channel(`my-cases-${session.user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "complaints", filter: `user_id=eq.${session.user.id}` }, () => { void loadCases(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, loadCases, session]);

  return <CitizenShell navigate={navigate}><Container as="main" className="cases-page"><div className="cases-heading"><div><Eyebrow>My cases</Eyebrow><h1>Your reports and updates.</h1><p>Open a case to see its human-review status, guidance, evidence, and timeline.</p></div><Button variant="dark" onClick={() => navigate("/report")}>New report <span>↗</span></Button></div>{error && <div className="report-error" role="alert">{error}</div>}{loading ? <div className="cases-loading">Loading your protected cases…</div> : cases.length === 0 ? <Card className="cases-empty" padding="large"><Eyebrow>No submitted cases</Eyebrow><h2>You have not submitted a report yet.</h2><p>Start with what you know. You can review everything before sending it to human review.</p><Button variant="dark" onClick={() => navigate("/report")}>Start a report</Button></Card> : <div className="cases-list">{cases.map((item) => <button className="case-row" type="button" key={item.id} onClick={() => navigate(`/case/${item.id}`)}><div className="case-row-main"><span className="case-number">{formatCaseNumber(item.case_number)}</span><h2>{item.categories?.name_en ?? "Reported problem"}</h2><p>{item.summary || item.original_text}</p><small>Submitted {formatDate(item.submitted_at)}</small></div><div className="case-row-meta"><UrgencyBadge urgency={item.final_urgency} /><StatusBadge tone={statusTone(item.status)}>{statusLabels[item.status]}</StatusBadge><span aria-hidden="true">→</span></div></button>)}</div>}</Container></CitizenShell>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <span className={`urgency-badge urgency-${urgency}`}>{urgency}</span>;
}

function statusTone(status: Complaint["status"]): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "closed" || status === "accepted" || status === "arrived") return "success";
  if (status === "rejected") return "danger";
  if (status === "under_review" || status === "reopened") return "warning";
  if (status === "team_assigned" || status === "on_the_way") return "info";
  return "neutral";
}
