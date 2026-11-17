import { useState } from "react";
import { BarChart3, Gauge, PhoneCall } from "lucide-react";
import { useApi } from "../../lib/hooks";
import { Badge, Card, Field, Input, Loading, PageHeader, StatCard, Table, Tabs } from "../../components/ui";
import { UsageView } from "../admin/AdminUsage";
import { inr, titleCase } from "../../lib/format";

function Meter({ label, used, allowance, unit }) {
  const pct = allowance ? Math.min(100, (used / allowance) * 100) : 0;
  const over = used > allowance;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={over ? "font-semibold text-rose-600" : "text-slate-500"}>
          {used.toLocaleString()} / {allowance.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </div>
      {over && <p className="mt-1 text-xs text-rose-600">{(used - allowance).toLocaleString()} {unit} over allowance — billed separately</p>}
    </div>
  );
}

function FirmReport() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [y, m] = month.split("-").map(Number);
  const { data, isLoading } = useApi(["firm-report", month], "/reports/firm", { year: y, month: m });
  if (isLoading) return <Loading />;
  const a = data.allowances;
  const notif = {};
  data.notifications.forEach((n) => ((notif[n.channel] ||= {})[n.status] = n.count));

  return (
    <>
      <Field label="Month" className="mb-5 w-48">
        <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hearings this month" value={data.hearings_in_period} icon={Gauge} />
        <StatCard label="Active reminders" value={data.active_reminders} tone="amber" />
        <StatCard label="Calls placed" value={Object.values(data.call_attempts_by_status).reduce((s, v) => s + v, 0)} icon={PhoneCall} tone="sky" />
        <StatCard label="Estimated usage cost" value={inr(data.usage.estimated_total_inr)} icon={BarChart3} tone="green" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Allowances">
          <div className="space-y-5">
            <Meter label="Court data API requests" used={a.api_requests_used} allowance={a.monthly_api_allowance} unit="requests" />
            <Meter label="Voice call minutes" used={a.call_minutes_used} allowance={a.monthly_call_allowance} unit="min" />
          </div>
        </Card>
        <Card title="Cases by status">
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.cases_by_status).map(([s, n]) => <Badge key={s} tone="brand">{s}: {n}</Badge>)}
            {!Object.keys(data.cases_by_status).length && <p className="text-sm text-slate-400">No cases</p>}
          </div>
        </Card>
        <Card title="Active cases by lawyer" padded={false}>
          <Table
            rowKey={(r) => r.user_id}
            rows={[...data.active_cases_by_lawyer].sort((x, y2) => y2.active_cases - x.active_cases)}
            columns={[
              { key: "name", label: "Lawyer" },
              {
                key: "active_cases",
                label: "Active cases",
                render: (r) => {
                  const max = Math.max(1, ...data.active_cases_by_lawyer.map((l) => l.active_cases));
                  return (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.active_cases / max) * 100}%` }} /></div>
                      {r.active_cases}
                    </div>
                  );
                },
              },
            ]}
          />
        </Card>
        <Card title="Notification delivery this month" padded={false}>
          <Table
            rowKey={(r) => r[0]}
            rows={Object.entries(notif)}
            empty="No notifications scheduled this month"
            columns={[
              { key: "ch", label: "Channel", render: ([ch]) => titleCase(ch) },
              { key: "st", label: "Status", render: ([, st]) => <div className="flex flex-wrap gap-1">{Object.entries(st).map(([s, n]) => <Badge key={s} tone={s === "sent" ? "green" : s === "failed" ? "rose" : "slate"}>{s}: {n}</Badge>)}</div> },
            ]}
          />
        </Card>
      </div>
    </>
  );
}

export default function Reports() {
  const [tab, setTab] = useState("report");
  return (
    <>
      <PageHeader title="Reports & usage" subtitle="Firm performance, allowances and third-party consumption." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "report", label: "Firm report" }, { value: "usage", label: "Usage detail" }]} />
      {tab === "report" ? <FirmReport /> : <UsageView path="/usage" />}
    </>
  );
}
