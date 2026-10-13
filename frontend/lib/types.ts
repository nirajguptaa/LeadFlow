export const STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"] as const;
export type Status = (typeof STATUSES)[number];

export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: Status;
  follow_up_at: string | null;
  created_at: string;
  last_note: string | null;
  last_discussion_at: string | null;
}

export interface Discussion {
  id: number;
  lead_id: number;
  note: string;
  follow_up_at: string | null;
  created_at: string;
}

export interface NewLead {
  name: string;
  company?: string;
  phone?: string;
}
