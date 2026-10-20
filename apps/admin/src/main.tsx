import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@haven/shared/styles.css";
import "./styles.css";
import { App } from "./App";
import { AuthProvider } from "@haven/shared";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey}>
      <App />
    </AuthProvider>
  </StrictMode>,
);
