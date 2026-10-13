import type { Status } from "@/lib/types";

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status.toLowerCase().replace(" ", "-")}`}>{status}</span>;
}
