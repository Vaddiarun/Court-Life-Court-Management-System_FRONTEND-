import { Link, useNavigate } from "react-router-dom";
import { AlarmClock, AlertTriangle, Bell, Briefcase, CalendarDays, CheckSquare, Gavel, Plus } from "lucide-react";
import { useApi } from "../../lib/hooks";
import { isManager, useAuth } from "../../lib/auth";
import { Badge, Button, Card, EmptyState, Loading, PageHeader, StatCard, StatusBadge } from "../../components/ui";
import { HearingCountdown } from "../../components/shared";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useApi("dashboard", "/dashboard");
  const { data: firm } = useApi("firm", "/firm", undefined, { enabled: user.role !== "client" });
  if (isLoading) return <Loading />;

  const isClient = user.role === "client";
  const dist = Object.entries(data.case_status_distribution || {});
  const total = dist.reduce((s, [, v]) => s + v, 0) || 1;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greet}, ${user.full_name.split(" ")[0]}`}
        subtitle={isClient ? "Here's the latest on your cases." : `${firm?.name || "Your firm"} — today's overview`}
        actions={
          isManager(user) && (
            <Link to="/cases/new">
              <Button icon={Plus}>Add case</Button>
            </Link>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={isClient ? "My active cases" : "Active cases"} value={data.active_cases} icon={Briefcase} hint={`${data.disposed_cases} disposed`} />
        <StatCard label="Hearings today" value={data.hearings_today} icon={Gavel} tone={data.hearings_today ? "rose" : "slate"} />
        {isClient ? (
          <StatCard label="Unread notifications" value={data.unread_notifications} icon={Bell} tone="sky" />
        ) : (
          <>
            <StatCard label="My open tasks" value={data.my_open_tasks} icon={CheckSquare} tone="sky" hint={data.overdue_tasks ? `${data.overdue_tasks} overdue` : "none overdue"} />
            <StatCard label="Pending reminders" value={data.pending_reminder_jobs} icon={AlarmClock} tone="amber" />
          </>
        )}
      </div>

      {!isClient && data.cases_with_sync_errors > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-5" />
          {data.cases_with_sync_errors} case(s) failed their last court sync.
          <Link to="/cases?sort=last_synced" className="font-semibold underline">Review</Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Upcoming hearings — next 7 days" className="lg:col-span-2" padded={false} actions={<Link to="/calendar" className="text-xs font-medium text-brand-600 hover:underline">Open calendar</Link>}>
          {!data.upcoming_hearings_7d.length ? (
            <EmptyState icon={CalendarDays} title="No hearings this week" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcoming_hearings_7d.map((h) => (
                <li key={h.hearing_id} onClick={() => navigate(`/cases/${h.case_id}`)} className="flex cursor-pointer items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{h.case_title}</p>
                    <p className="text-xs text-slate-500">{h.purpose || "Hearing"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <StatusBadge value={h.source} />
                    <HearingCountdown date={h.date} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Case status">
          {!dist.length ? (
            <EmptyState title="No cases yet" />
          ) : (
            <ul className="space-y-3">
              {dist.map(([k, v]) => (
                <li key={k}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{k}</span>
                    <Badge>{v}</Badge>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${(v / total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
