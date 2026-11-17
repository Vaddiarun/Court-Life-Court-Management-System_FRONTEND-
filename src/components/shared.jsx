import { CalendarClock } from "lucide-react";
import { Badge } from "./ui";
import { daysUntil, fmtDate, timeAgo } from "../lib/format";
import { ROLE_LABEL } from "../lib/auth";

// Multi-select of firm members rendered as toggle chips.
export function MemberPicker({ members = [], value = [], onChange, emptyText = "No people available" }) {
  if (!members.length) return <p className="text-sm text-slate-400">{emptyText}</p>;
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const on = value.includes(m.id);
        return (
          <button
            type="button"
            key={m.id}
            onClick={() => toggle(m.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"
            }`}
          >
            {m.full_name}
            <span className={on ? "text-indigo-200" : "text-slate-400"}> · {ROLE_LABEL[m.role]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function HearingCountdown({ date, badgeOnly }) {
  const d = daysUntil(date);
  if (d == null) return <span className="text-slate-400">No date</span>;
  const tone = d < 0 ? "slate" : d === 0 ? "rose" : d <= 3 ? "amber" : "sky";
  const label = d < 0 ? `${-d}d ago` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `in ${d}d`;
  return (
    <span className="flex items-center gap-2">
      {!badgeOnly && <span>{fmtDate(date)}</span>}
      <Badge tone={tone}>
        <CalendarClock className="size-3" />
        {label}
      </Badge>
    </span>
  );
}

export function SourceNote({ c }) {
  return (
    <p className="text-xs text-slate-400">
      Source: {c.source === "provider" ? `court data provider (${c.provider_name || "—"})` : "manual entry"} · Last synced {timeAgo(c.last_synced_at)}
    </p>
  );
}
