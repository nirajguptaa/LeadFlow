import { STATUSES, type Status } from "@/lib/types";

interface Props {
  value: Status | "All";
  onChange: (value: Status | "All") => void;
}

export default function FilterBar({ value, onChange }: Props) {
  return (
    <div className="filters" role="group" aria-label="Filter by status">
      <span className="filters-label">Filters:</span>
      {(["All", ...STATUSES] as const).map((s) => (
        <button
          key={s}
          type="button"
          className={`chip ${value === s ? "chip-active" : ""}`}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
