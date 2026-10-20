import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Brand, Button, Container, useAuth } from "@haven/shared";

type Navigate = (path: string) => void;
type Notification = { id: string; complaint_id: string | null; title: string; message: string; read_at: string | null; created_at: string };

export function CitizenShell({ children, navigate }: { children: ReactNode; navigate: Navigate }) {
  const { client, signOut, session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]); const [notificationsOpen, setNotificationsOpen] = useState(false);
  const language = String(session?.user.user_metadata.language ?? "en") as "en" | "ur" | "sd";
  const copy = language === "ur"
    ? { report: "مسئلہ رپورٹ کریں", cases: "میرے کیس", settings: "ترتیبات", signOut: "سائن آؤٹ", emergency: "پولیس 15 کو کال کریں", notifications: "اطلاعات", none: "کوئی نئی اطلاع نہیں" }
    : language === "sd"
      ? { report: "مسئلو رپورٽ ڪريو", cases: "منهنجا ڪيس", settings: "سيٽنگون", signOut: "سائن آئوٽ", emergency: "پوليس 15 کي ڪال ڪريو", notifications: "اطلاع", none: "ڪابه نئين اطلاع ناهي" }
      : { report: "Report a problem", cases: "My cases", settings: "Settings", signOut: "Sign out", emergency: "Call 15 Police", notifications: "Notifications", none: "No new notifications" };

  const loadNotifications = useCallback(async () => {
    if (!client || !session) return;
    const result = await client.from("notifications").select("id,complaint_id,title,message,read_at,created_at").order("created_at", { ascending: false }).limit(8);
    if (!result.error) setNotifications((result.data ?? []) as Notification[]);
  }, [client, session]);

  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === "en" ? "ltr" : "rtl"; }, [language]);
  useEffect(() => { void loadNotifications(); }, [loadNotifications]);
  useEffect(() => {
    if (!client || !session) return;
    const channel = client.channel(`citizen-notifications-${session.user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` }, () => void loadNotifications()).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, loadNotifications, session]);

  const go = (event: MouseEvent<HTMLAnchorElement>, path: string) => { event.preventDefault(); navigate(path); };
  const unread = notifications.filter((item) => !item.read_at).length;
  async function openNotification(item: Notification) {
    if (client && !item.read_at) { await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id); await loadNotifications(); }
    setNotificationsOpen(false); if (item.complaint_id) navigate(`/case/${item.complaint_id}`);
  }

  return <div className="citizen-account">
    <a className="skip-link" href="#citizen-main">Skip to main content</a>
    <header className="account-header"><Container className="account-nav">
      <a href="/app" onClick={(event) => go(event, "/app")}><Brand /></a>
      <nav className="account-links" aria-label="Citizen account"><a href="/report" onClick={(event) => go(event, "/report")}>{copy.report}</a><a href="/cases" onClick={(event) => go(event, "/cases")}>{copy.cases}</a><a href="/settings" onClick={(event) => go(event, "/settings")}>{copy.settings}</a></nav>
      <div className="account-actions"><div className="notification-center"><button className="notification-button" type="button" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}><span aria-hidden="true">●</span>{copy.notifications}{unread > 0 && <b>{unread}</b>}</button>{notificationsOpen && <div className="notification-popover" role="region" aria-label={copy.notifications}>{notifications.length ? notifications.map((item) => <button type="button" className={item.read_at ? "" : "unread"} key={item.id} onClick={() => void openNotification(item)}><strong>{item.title}</strong><span>{item.message}</span></button>) : <p>{copy.none}</p>}</div>}</div><Button size="small" variant="light" onClick={async () => { await signOut(); navigate("/"); }}>{copy.signOut}</Button></div>
    </Container></header>
    <div id="citizen-main">{children}</div><a className="account-emergency" href="tel:15">{copy.emergency}</a>
  </div>;
}
