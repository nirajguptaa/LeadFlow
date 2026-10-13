"use client";

import { FormEvent, useState } from "react";
import { createLead, errorMessage } from "@/lib/api";
import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddLeadDialog({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createLead({ name: name.trim(), company: company.trim(), phone: phone.trim() });
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal label="Add new lead" onClose={onClose} width={448}>
      <form onSubmit={submit}>
        <div className="modal-header">
          <h2>Add New Lead</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span>Full Name <span className="required">*</span></span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., John Doe" maxLength={120} />
          </label>
          <label className="field">
            <span>Company <span className="optional">(Optional)</span></span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., Stark Industries" maxLength={120} />
          </label>
          <label className="field">
            <span>Phone <span className="optional">(Optional)</span></span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 555-0123" maxLength={40} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Lead"}</button>
        </div>
      </form>
    </Modal>
  );
}
