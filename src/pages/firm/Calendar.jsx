import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useApi, useMembers } from "../../lib/hooks";
import { isManager, useAuth } from "../../lib/auth";
import { Button, Card, EmptyState, Loading, PageHeader, Select, StatusBadge } from "../../components/ui";
import { fmtDate, todayISO } from "../../lib/format";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s) => new Date(s + "T00:00:00");
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shift(anchor, view, dir) {
  const d = parse(anchor);
  if (view === "month") d.setMonth(d.getMonth() + dir, 1);
  else d.setDate(d.getDate() + (view === "week" ? 7 : 1) * dir);
  return iso(d);
}

function title(anchor, view) {
  const d = parse(anchor);
  if (view === "month") return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  if (view === "day") return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${fmtDate(iso(start))} – ${fmtDate(iso(end))}`;
}

function HearingChip({ h, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium ${
        h.source === "official" ? "bg-violet-100 text-violet-800 hover:bg-violet-200" : "bg-sky-100 text-sky-800 hover:bg-sky-200"
      }`}
      title={`${h.case_title} — ${h.purpose || "Hearing"}`}
    >
      {h.start_time && <span className="mr-1 opacity-70">{h.start_time}</span>}
      {h.case_title}
    </button>
  );
}

export default function Calendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("month");
  const [anchor, setAnchor] = useState(todayISO());
  const [source, setSource] = useState("");
  const [lawyer, setLawyer] = useState("");
  const { data: lawyers } = useMembers("lawyer", { enabled: isManager(user) });
  const params = { view, on: anchor, source: source || undefined, lawyer_id: lawyer || undefined };
  const { data, isLoading } = useApi(["calendar", params], "/hearings", params);

  const byDay = useMemo(() => {
    const m = {};
    (data || []).forEach((h) => (m[h.hearing_date] ||= []).push(h));
    return m;
  }, [data]);

  const monthCells = useMemo(() => {
    const first = parse(anchor);
    first.setDate(1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchor]);

  const today = todayISO();
  const open = (h) => navigate(`/cases/${h.case_id}`);

  return (
    <>
      <PageHeader
        title="Hearing calendar"
        subtitle={
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-violet-400" /> Official</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-sky-400" /> Manual entry</span>
          </span>
        }
        actions={
          <>
            {isManager(user) && (
              <Select className="w-44" value={lawyer} onChange={(e) => setLawyer(e.target.value)}>
                <option value="">All lawyers</option>
                {lawyers?.items?.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </Select>
            )}
            <Select className="w-36" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All sources</option>
              <option value="official">Official only</option>
              <option value="manual">Manual only</option>
            </Select>
            <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
              {["day", "week", "month"].map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1 capitalize ${view === v ? "bg-brand-600 text-white" : "text-slate-600"}`}>
                  {v}
                </button>
              ))}
            </div>
          </>
        }
      />
      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={ChevronLeft} onClick={() => setAnchor(shift(anchor, view, -1))} />
            <Button size="sm" variant="secondary" icon={ChevronRight} onClick={() => setAnchor(shift(anchor, view, 1))} />
            <Button size="sm" variant="ghost" onClick={() => setAnchor(todayISO())}>Today</Button>
          </div>
          <h2 className="text-base font-semibold text-slate-800">{title(anchor, view)}</h2>
          <span className="text-sm text-slate-500">{data?.length ?? 0} hearing(s)</span>
        </div>

        {isLoading ? (
          <Loading />
        ) : view === "month" ? (
          <div className="grid grid-cols-7">
            {DOW.map((d) => (
              <div key={d} className="border-b border-slate-100 bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase text-slate-500">{d}</div>
            ))}
            {monthCells.map((d) => {
              const key = iso(d);
              const inMonth = d.getMonth() === parse(anchor).getMonth();
              const items = byDay[key] || [];
              return (
                <div key={key} className={`min-h-28 border-b border-r border-slate-100 p-1.5 ${inMonth ? "bg-white" : "bg-slate-50/60"}`}>
                  <button
                    onClick={() => { setAnchor(key); setView("day"); }}
                    className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs ${
                      key === today ? "bg-brand-600 font-bold text-white" : inMonth ? "text-slate-700 hover:bg-slate-100" : "text-slate-300"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((h) => <HearingChip key={h.id} h={h} onClick={() => open(h)} />)}
                    {items.length > 3 && (
                      <button className="text-[11px] font-medium text-brand-600" onClick={() => { setAnchor(key); setView("day"); }}>
                        +{items.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : !data.length ? (
          <EmptyState icon={CalendarDays} title="No hearings in this period" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {Object.entries(byDay)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, items]) => (
                <li key={day} className="px-5 py-4">
                  <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${day === today ? "text-brand-600" : "text-slate-500"}`}>
                    {parse(day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} {day === today && "· Today"}
                  </p>
                  <div className="space-y-2">
                    {items.map((h) => (
                      <button key={h.id} onClick={() => open(h)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-brand-300 hover:bg-brand-50/30">
                        <div>
                          <p className="font-medium text-slate-800">{h.case_title}</p>
                          <p className="text-xs text-slate-500">{[h.start_time, h.purpose, h.court_room, h.judge].filter(Boolean).join(" · ") || "Hearing"}</p>
                        </div>
                        <StatusBadge value={h.source} />
                      </button>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </>
  );
}
