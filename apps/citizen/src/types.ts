export type LanguageCode = "en" | "ur" | "sd";
export type Urgency = "low" | "medium" | "high" | "critical";
export type ComplaintStatus = "draft" | "submitted" | "under_review" | "accepted" | "team_assigned" | "on_the_way" | "arrived" | "closed" | "rejected" | "reopened";

export type Category = {
  id: string;
  code: string;
  name_en: string;
  name_ur: string | null;
  name_sd: string | null;
  track: "safety" | "civic";
};

export type Complaint = {
  id: string;
  case_number: number;
  category_id: string;
  track: "safety" | "civic";
  original_language: LanguageCode;
  original_text: string;
  summary: string | null;
  final_urgency: Urgency;
  urgency_reason: string | null;
  danger_flags: string[];
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  incident_at: string | null;
  is_anonymous: boolean;
  status: ComplaintStatus;
  rejection_reason: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  categories: Pick<Category, "code" | "name_en" | "name_ur" | "name_sd"> | null;
};

export type StatusUpdate = {
  id: number;
  status: ComplaintStatus;
  note: string | null;
  created_at: string;
};

export const statusLabels: Record<ComplaintStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  team_assigned: "Team assigned",
  on_the_way: "On the way",
  arrived: "Arrived",
  closed: "Closed",
  rejected: "Rejected",
  reopened: "Reopened",
};

export function formatCaseNumber(value: number) {
  return `HAV-${String(value).padStart(6, "0")}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
