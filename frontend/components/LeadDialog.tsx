"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { addDiscussion, errorMessage, getLead, listDiscussions, updateStatus } from "@/lib/api";
import { formatDateTime, localToIso, timeAgo, toDateInput } from "@/lib/time";
import { STATUSES, type Discussion, type Lead, type Status } from "@/lib/types";
import Modal from "./Modal";

interface Props {
  leadId: number;
  onClose: () => void;
  onChanged: () => void; // tells the list to refresh
}

export default function LeadDialog({ leadId, onClose, onChanged }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [items, setItems] = useState<Discussion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [withFollowUp, setWithFollowUp] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [l, d] = await Promise.all([getLead(leadId), listDiscussions(leadId)]);
    setLead(l);
    setItems(d);
  }, [leadId]);

  useEffect(() => {
    refresh().catch((e) => setError(errorMessage(e)));
  }, [refresh]);

  function toggleFollowUp(checked: boolean) {
    setWithFollowUp(checked);
    // Suggest tomorrow at 10:00 so the rep only has to adjust it.
    if (checked && !date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(toDateInput(tomorrow));
      setTime("10:00");
    }
  }

  async function changeStatus(next: Status) {
    if (!lead) return;
    const previous = lead.status;
    setLead({ ...lead, status: next });
    setError(null);
    try {
      setLead(await updateStatus(leadId, next));
      onChanged();
    } catch (e) {
      setLead((l) => (l ? { ...l, status: previous } : l));
      setError(errorMessage(e));
    }
  }

  async function saveNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      setError("Write a note before saving.");
      return;
    }
    if (withFollowUp && (!date || !time)) {
      setError("Pick both a date and a time for the follow-up.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addDiscussion(leadId, {
        note: note.trim(),
        follow_up_at: withFollowUp ? localToIso(date, time) : null,
      });
      setNote("");
      setWithFollowUp(false);
      setDate("");
      setTime("");
      await refresh();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal label="Lead details" onClose={onClose} width={672}>
      <div className="modal-header">
        <div>
          <h2>
            {lead?.name ?? "Loading..."}
            {lead?.company && <span className="lead-company"> ({lead.company})</span>}
          </h2>
          {lead?.phone && <div className="phone">📞 {lead.phone}</div>}
        </div>
        <div className="header-actions">
          {lead && (
            <select value={lead.status} onChange={(e) => changeStatus(e.target.value as Status)} aria-label="Lead status">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="timeline">
        {items.map((d, i) => (
          <div className="tl-item" key={d.id}>
            <span className={`tl-dot ${i === 0 ? "tl-dot-latest" : ""}`} />
            <div className="tl-meta">
              {formatDateTime(d.created_at)} <span className="ago">({timeAgo(d.created_at)})</span>
            </div>
            <div className="tl-body">
              <p>{d.note}</p>
              {d.follow_up_at && <span className="followup followup-today">📅 Follow-up set for: {formatDateTime(d.follow_up_at)}</span>}
            </div>
          </div>
        ))}
        {lead && items.length === 0 && <p className="muted">No discussions yet.</p>}
      </div>

      <form className="note-form" onSubmit={saveNote}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Log a new discussion..."
          rows={3}
          maxLength={5000}
        />
        {lead?.follow_up_at && !withFollowUp && (
          <p className="hint">Saving without a follow-up clears the current one ({formatDateTime(lead.follow_up_at)}).</p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="note-actions">
          <label className="check">
            <input type="checkbox" checked={withFollowUp} onChange={(e) => toggleFollowUp(e.target.checked)} />
            Set Follow-up
          </label>
          <input type="date" value={date} min={toDateInput(new Date())} disabled={!withFollowUp} onChange={(e) => setDate(e.target.value)} aria-label="Follow-up date" />
          <input type="time" value={time} disabled={!withFollowUp} onChange={(e) => setTime(e.target.value)} aria-label="Follow-up time" />
          <button type="submit" className="btn-dark" disabled={saving || !note.trim()}>
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
