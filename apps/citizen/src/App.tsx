import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@haven/shared";
import { AuthPage } from "./pages/AuthPage";
import { CitizenHome } from "./pages/CitizenHome";
import { LandingPage } from "./pages/LandingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ReportFlowPage } from "./pages/ReportFlowPage";
import { MyCasesPage } from "./pages/MyCasesPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";

function currentPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const titles: Record<string, string> = { "/": "Haven · Citizen safety and complaint rescue", "/login": "Sign in · Haven", "/signup": "Create account · Haven", "/app": "Your Haven", "/settings": "Settings · Haven", "/report": "Report a problem · Haven", "/cases": "My cases · Haven" };
    document.title = path.startsWith("/case/") ? "Case details · Haven" : (titles[path] ?? "Haven");
    if (["/", "/login", "/signup"].includes(path)) { document.documentElement.lang = "en"; document.documentElement.dir = "ltr"; }
  }, [path]);

  const navigate = useCallback((nextPath: string) => {
    if (currentPath() !== nextPath) window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  if (path === "/login") return <AuthPage mode="login" navigate={navigate} />;
  if (path === "/signup") return <AuthPage mode="signup" navigate={navigate} />;
  if (path === "/app") {
    return <ProtectedRoute onUnauthenticated={() => navigate("/login")} fallback={<RouteLoading />}><CitizenHome navigate={navigate} /></ProtectedRoute>;
  }
  if (path === "/settings") {
    return <ProtectedRoute onUnauthenticated={() => navigate("/login")} fallback={<RouteLoading />}><SettingsPage navigate={navigate} /></ProtectedRoute>;
  }
  if (path === "/report") {
    return <ProtectedRoute onUnauthenticated={() => navigate("/login")} fallback={<RouteLoading />}><ReportFlowPage navigate={navigate} /></ProtectedRoute>;
  }
  if (path === "/cases") {
    return <ProtectedRoute onUnauthenticated={() => navigate("/login")} fallback={<RouteLoading />}><MyCasesPage navigate={navigate} /></ProtectedRoute>;
  }
  if (path.startsWith("/case/")) {
    const caseId = path.slice("/case/".length);
    return <ProtectedRoute onUnauthenticated={() => navigate("/login")} fallback={<RouteLoading />}><CaseDetailPage caseId={caseId} navigate={navigate} /></ProtectedRoute>;
  }
  return <LandingPage navigate={navigate} />;
}

function RouteLoading() {
  return <div className="route-loading" role="status">Checking your secure session…</div>;
}
