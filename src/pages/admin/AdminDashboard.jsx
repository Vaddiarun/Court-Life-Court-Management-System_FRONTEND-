import { Link } from "react-router-dom";
import { Activity, Briefcase, Building2, Play, Send, Users } from "lucide-react";
import { post } from "../../api/client";
import { useAction, useApi } from "../../lib/hooks";
import { Badge, Button, Card, Loading, PageHeader, StatCard, Table } from "../../components/ui";
import { ROLE_LABEL } from "../../lib/auth";
import { titleCase } from "../../lib/format";

function Breakdown({ data, labels = {} }) {
  const entries = Object.entries(data || {});
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  if (!entries.length) return <p className="text-sm text-slate-400">No data yet</p>;
  return (
    <ul className="space-y-3">
      {entries.map(([k, v]) => (
        <li key={k}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-600">{labels[k] || titleCase(k)}</span>
            <span className="font-semibold text-slate-800">{v}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(v / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useApi("admin-overview", "/admin/reports/overview");
  const sync = useAction(() => post("/admin/jobs/sync"), {
    success: (r) => `Sync run: ${r.refresh_requested} refresh requested, ${r.checked} checked, ${r.changed} changed`,
    invalidate: ["admin-overview"],
  });
  const dispatch = useAction(() => post("/admin/jobs/dispatch"), {
    success: (r) => `Dispatched ${r.processed} notification job(s)`,
    invalidate: ["admin-overview"],
  });

  if (isLoading) return <Loading />;
  const firms = Object.values(data.tenants_by_status || {}).reduce((a, b) => a + b, 0);
  const users = Object.values(data.users_by_role || {}).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        title="Platform overview"
        subtitle="All law firms, users, integrations and background jobs."
        actions={
          <>
            <Button variant="secondary" icon={Play} loading={sync.isPending} onClick={() => sync.mutate()}>
              Run court sync
            </Button>
            <Button variant="secondary" icon={Send} loading={dispatch.isPending} onClick={() => dispatch.mutate()}>
              Dispatch reminders
            </Button>
            <Link to="/admin/firms">
              <Button icon={Building2}>Manage firms</Button>
            </Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Law firms" value={firms} icon={Building2} hint={`${data.tenants_by_status?.suspended || 0} suspended`} />
        <StatCard label="Users" value={users} icon={Users} tone="sky" />
        <StatCard label="Cases tracked" value={data.total_cases} icon={Briefcase} tone="green" />
        <StatCard label="Expired subscriptions" value={data.subscriptions_expired} icon={Activity} tone={data.subscriptions_expired ? "rose" : "slate"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Firms by plan">
          <Breakdown data={data.tenants_by_plan} />
        </Card>
        <Card title="Users by role">
          <Breakdown data={data.users_by_role} labels={ROLE_LABEL} />
        </Card>
        <Card title="Sync runs">
          <Breakdown data={data.sync_runs_by_status} />
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Integration health" className="lg:col-span-2" padded={false}>
          <Table
            rowKey={(r) => r.provider}
            empty="No provider calls yet"
            rows={data.integrations}
            columns={[
              { key: "provider", label: "Provider", render: (r) => <span className="font-medium">{r.provider}</span> },
              { key: "requests", label: "Requests" },
              { key: "failures", label: "Failures" },
              {
                key: "success_rate",
                label: "Success rate",
                render: (r) =>
                  r.success_rate == null ? "—" : <Badge tone={r.success_rate > 0.95 ? "green" : r.success_rate > 0.8 ? "amber" : "rose"}>{(r.success_rate * 100).toFixed(1)}%</Badge>,
              },
              { key: "avg_latency_ms", label: "Avg latency", render: (r) => (r.avg_latency_ms != null ? `${r.avg_latency_ms} ms` : "—") },
            ]}
          />
        </Card>
        <Card title="Notification jobs">
          <Breakdown data={data.notification_jobs_by_status} />
        </Card>
      </div>
    </>
  );
}
