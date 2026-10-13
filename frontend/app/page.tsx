"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AddLeadDialog from "@/components/AddLeadDialog";
import FilterBar from "@/components/FilterBar";
import LeadCard from "@/components/LeadCard";
import LeadDialog from "@/components/LeadDialog";
import { errorMessage, listLeads } from "@/lib/api";
import { followUpState } from "@/lib/time";
import type { Lead, Status } from "@/lib/types";

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<Status | "All">("All");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [, setTick] = useState(0);
  const latestRequest = useRef(0);

  // Wait a moment after typing before calling the API.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Re-draw once a minute so "time ago" and overdue states stay right.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const id = ++latestRequest.current;
    try {
      const data = await listLeads({ status: status === "All" ? undefined : status, search: query || undefined });
      if (id !== latestRequest.current) return; // a newer request is already in flight
      setLeads(data);
      setError(null);
    } catch (e) {
      if (id === latestRequest.current) setError(errorMessage(e));
    } finally {
      if (id === latestRequest.current) setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    load();
  }, [load]);

  const pinned = leads
    .filter((l) => {
      const s = followUpState(l.follow_up_at, l.status);
      return s === "today" || s === "overdue";
    })
    .sort((a, b) => new Date(a.follow_up_at!).getTime() - new Date(b.follow_up_at!).getTime());
  const pinnedIds = new Set(pinned.map((l) => l.id));
  const isClosed = (l: Lead) => l.status === "Won" || l.status === "Lost";
  const rest = leads.filter((l) => !pinnedIds.has(l.id));
  const others = [...rest.filter((l) => !isClosed(l)), ...rest.filter(isClosed)];

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <h1 className="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            LeadFlow
          </h1>
          <button type="button" className="btn-primary" onClick={() => setAdding(true)}>+ Add New Lead</button>
        </div>
      </header>

      <main className="container">
        <div className="toolbar">
          <FilterBar value={status} onChange={setStatus} />
          <input
            className="search"
            type="search"
            placeholder="Search by name or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search leads"
          />
        </div>

        {error && <p className="banner-error" role="alert">{error}</p>}
        {loading && <p className="muted">Loading leads...</p>}

        {!loading && !error && leads.length === 0 && (
          <p className="muted empty">No leads found. Try another filter or add a new lead.</p>
        )}

        {pinned.length > 0 && (
          <section>
            <h3 className="section-title">📌 Today&apos;s follow-ups</h3>
            <div className="list">
              {pinned.map((l) => (
                <LeadCard key={l.id} lead={l} highlight onOpen={setOpenId} />
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <h3 className="section-title">All leads</h3>
            <div className="list">
              {others.map((l) => (
                <LeadCard key={l.id} lead={l} onOpen={setOpenId} />
              ))}
            </div>
          </section>
        )}
      </main>

      {openId !== null && <LeadDialog leadId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
      {adding && <AddLeadDialog onClose={() => setAdding(false)} onCreated={load} />}
    </>
  );
}
