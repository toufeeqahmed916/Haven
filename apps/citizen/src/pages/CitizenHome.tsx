import { Button, Card, Container, Eyebrow, StatusBadge, useAuth } from "@haven/shared";
import { CitizenShell } from "../components/CitizenShell";

type Navigate = (path: string) => void;

export function CitizenHome({ navigate }: { navigate: Navigate }) {
  const { session } = useAuth();
  const draft = sessionStorage.getItem("haven-report-draft");
  const name = String(session?.user.user_metadata.display_name ?? "there");

  return <CitizenShell navigate={navigate}><Container as="main" className="account-main"><div className="account-heading"><div><Eyebrow>Your Haven</Eyebrow><h1>Welcome, {name}.</h1><p>Start a report in your own words or check the progress of a case you already submitted.</p></div><StatusBadge tone="success">Signed in securely</StatusBadge></div><div className="account-grid"><Card tone={draft ? "sand" : "white"} padding="large"><Eyebrow>{draft ? "Saved locally" : "New report"}</Eyebrow><h2>{draft ? "Your report draft is waiting." : "Tell us what happened."}</h2><p>{draft ? "The draft remains in this browser and has not been submitted. Continue when you feel ready." : "Use text and private media, confirm your category and location, then review everything before submitting."}</p><Button variant="dark" onClick={() => navigate("/report")}>{draft ? "Continue draft" : "Start a report"} <span aria-hidden="true">↗</span></Button></Card><Card tone="sage" padding="large"><Eyebrow>My cases</Eyebrow><h2>Follow every update.</h2><p>See urgency, human-review status, documents, and the full case timeline.</p><Button variant="light" onClick={() => navigate("/cases")}>View my cases</Button></Card></div><div className="account-safety-note"><b>Haven is not an emergency service.</b><span>If anyone is in immediate danger, contact the appropriate emergency service directly.</span><a href="tel:15">Call Police at 15</a></div></Container></CitizenShell>;
}
