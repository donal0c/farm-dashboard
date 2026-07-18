export type BriefPriority = "act" | "check" | "watch";

export type BriefEvidence = {
  id: string;
  label: string;
  sourceLabel: string;
  sourceUrl: string;
  observedAt: string | null;
  scope: string;
  confidence: string;
  explanation: string;
};

export type BriefItem = {
  id: string;
  priority: BriefPriority;
  eyebrow: string;
  title: string;
  summary: string;
  detail: string;
  evidenceId: string;
  relevantDates: string[];
};

export type WeeklyBrief = {
  generatedAt: string;
  items: BriefItem[];
  evidence: BriefEvidence[];
};
