import { followUpState, formatDateTime, formatTime, timeAgo } from "@/lib/time";
import type { Lead } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface Props {
  lead: Lead;
  highlight?: boolean;
  onOpen: (id: number) => void;
}

function FollowUpChip({ lead }: { lead: Lead }) {
  const state = followUpState(lead.follow_up_at, lead.status);
  if (!state || !lead.follow_up_at) return null;

  if (state === "overdue") {
    return <span className="followup followup-overdue">⚠ Overdue: {formatDateTime(lead.follow_up_at)}</span>;
  }
  if (state === "today") {
    return <span className="followup followup-today">🔔 Follow-up today at {formatTime(lead.follow_up_at)}</span>;
  }
  return <span className="followup followup-upcoming">📅 Follow-up {formatDateTime(lead.follow_up_at)}</span>;
}

export default function LeadCard({ lead, highlight = false, onOpen }: Props) {
  const closed = lead.status === "Won" || lead.status === "Lost";
  const state = followUpState(lead.follow_up_at, lead.status);
  const classes = ["card", highlight ? (state === "overdue" ? "card-overdue" : "card-today") : "", closed ? "card-closed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classes} onClick={() => onOpen(lead.id)}>
      <div className="card-top">
        <span className="lead-name">
          {lead.name}
          {lead.company && <span className="lead-company"> ({lead.company})</span>}
        </span>
        <StatusBadge status={lead.status} />
      </div>
      <div className="card-note">
        <strong>Last Note:</strong> <span className="note-text">{lead.last_note ?? "No notes yet"}</span>
        {lead.last_discussion_at && <span className="ago">{timeAgo(lead.last_discussion_at)}</span>}
      </div>
      <FollowUpChip lead={lead} />
    </button>
  );
}
