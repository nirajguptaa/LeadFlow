import type { Discussion, Lead, NewLead, Status } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach the server. Check that the API is running.");
  }

  if (!res.ok) {
    let message = `Something went wrong (error ${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d: { msg: string }) => d.msg).join(", ");
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function listLeads(params: { status?: Status; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  const query = qs.toString();
  return request<Lead[]>(`/leads${query ? `?${query}` : ""}`);
}

export const getLead = (id: number) => request<Lead>(`/leads/${id}`);

export const createLead = (lead: NewLead) =>
  request<Lead>("/leads", { method: "POST", body: JSON.stringify(lead) });

export const updateStatus = (id: number, status: Status) =>
  request<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const listDiscussions = (id: number) => request<Discussion[]>(`/leads/${id}/discussions`);

export const addDiscussion = (id: number, body: { note: string; follow_up_at: string | null }) =>
  request<Discussion>(`/leads/${id}/discussions`, { method: "POST", body: JSON.stringify(body) });

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
