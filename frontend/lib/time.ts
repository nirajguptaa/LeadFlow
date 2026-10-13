import type { Status } from "./types";

export function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

export type FollowUpState = "overdue" | "today" | "upcoming" | null;

/** Won and Lost leads never need a follow-up, so they are ignored here. */
export function followUpState(iso: string | null, status: Status): FollowUpState {
  if (!iso || status === "Won" || status === "Lost") return null;
  const when = new Date(iso);
  const now = new Date();
  if (when.getTime() < now.getTime()) return "overdue";
  return when.toDateString() === now.toDateString() ? "today" : "upcoming";
}

/** Turns the date + time a user picked (in their own timezone) into a UTC ISO string. */
export function localToIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
