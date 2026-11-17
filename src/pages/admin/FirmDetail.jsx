import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CheckCircle2, Save } from "lucide-react";
import { patch } from "../../api/client";
import { useAction, useApi } from "../../lib/hooks";
import { Badge, Button, Card, Field, Input, Loading, PageHeader, Select, StatCard, StatusBadge, Table } from "../../components/ui";
import { ROLE_LABEL } from "../../lib/auth";
import { fmtDate, inr, titleCase } from "../../lib/format";
import { PLANS } from "./Firms";

export default function FirmDetail() {
  const { id } = useParams();
  const { data: firm, isLoading } = useApi(["firm", id], `/admin/tenants/${id}`);
  const { data: users } = useApi(["firm-users", id], `/admin/tenants/${id}/users`);
  const { data: usage } = useApi(["firm-usage", id], "/admin/usage", { tenant_id: id });
  const [f, setF] = useState(null);

  useEffect(() => {
    if (firm)
      setF({
        plan: firm.plan,
        monthly_api_allowance: firm.monthly_api_allowance,
        monthly_call_allowance: firm.monthly_call_allowance,
        subscription_ends_at: firm.subscription_ends_at || "",
        contact_email: firm.contact_email || "",
        contact_phone: firm.contact_phone || "",
      });
  }, [firm]);

  const save = useAction(
    (body) => patch(`/admin/tenants/${id}`, body),
    { success: "Firm updated", invalidate: [["firm", id], "firms", "admin-overview"] },
  );

  if (isLoading || !f) return <Loading />;
  const suspended = firm.status === "suspended";

  return (
    <>
      <Link to="/admin/firms" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> All firms
      </Link>
      <PageHeader
        title={firm.name}
        subtitle={<span className="flex items-center gap-2">{firm.slug} <StatusBadge value={firm.status} /></span>}
        actions={
          suspended ? (
            <Button variant="success" icon={CheckCircle2} onClick={() => save.mutate({ status: "active" })}>Reactivate</Button>
          ) : (
            <Button variant="danger" icon={Ban} onClick={() => confirm(`Suspend ${firm.name}? All its users will be locked out.`) && save.mutate({ status: "suspended" })}>
              Suspend firm
            </Button>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Users" value={users?.length} tone="sky" />
        <StatCard label="Court API requests (this month)" value={usage?.court_api_requests} hint={`Allowance ${firm.monthly_api_allowance.toLocaleString()}`} />
        <StatCard label="Estimated usage cost" value={usage ? inr(usage.estimated_total_inr) : "—"} tone="green" hint={`${usage?.call_minutes || 0} call minutes`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Subscription & allowances">
          <div className="space-y-4">
            <Field label="Plan">
              <Select value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}>
                {PLANS.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
              </Select>
            </Field>
            <Field label="Monthly court API allowance">
              <Input type="number" value={f.monthly_api_allowance} onChange={(e) => setF({ ...f, monthly_api_allowance: e.target.value })} />
            </Field>
            <Field label="Monthly call allowance (min)">
              <Input type="number" value={f.monthly_call_allowance} onChange={(e) => setF({ ...f, monthly_call_allowance: e.target.value })} />
            </Field>
            <Field label="Subscription ends">
              <Input type="date" value={f.subscription_ends_at} onChange={(e) => setF({ ...f, subscription_ends_at: e.target.value })} />
            </Field>
            <Field label="Contact email"><Input value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></Field>
            <Field label="Contact phone"><Input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></Field>
            <Button
              icon={Save}
              className="w-full"
              loading={save.isPending}
              onClick={() =>
                save.mutate({
                  plan: f.plan,
                  monthly_api_allowance: +f.monthly_api_allowance,
                  monthly_call_allowance: +f.monthly_call_allowance,
                  subscription_ends_at: f.subscription_ends_at || null,
                  contact_email: f.contact_email || null,
                  contact_phone: f.contact_phone || null,
                })
              }
            >
              Save changes
            </Button>
          </div>
        </Card>
        <Card title="Users" className="lg:col-span-2" padded={false}>
          <Table
            rows={users}
            columns={[
              { key: "full_name", label: "Name", render: (u) => <span className="font-medium">{u.full_name}</span> },
              { key: "role", label: "Role", render: (u) => <Badge tone="brand">{ROLE_LABEL[u.role]}</Badge> },
              { key: "email", label: "Contact", render: (u) => <span className="text-xs">{u.email || u.phone}</span> },
              { key: "is_active", label: "Status", render: (u) => <StatusBadge value={u.is_active ? "active" : "suspended"} /> },
              { key: "created_at", label: "Joined", render: (u) => fmtDate(u.created_at) },
            ]}
          />
        </Card>
      </div>
      {usage?.items?.length > 0 && (
        <Card title="Usage this month" className="mt-6" padded={false}>
          <Table
            rowKey={(r) => r.provider + r.operation}
            rows={usage.items}
            columns={[
              { key: "provider", label: "Provider" },
              { key: "operation", label: "Operation", render: (r) => titleCase(r.operation) },
              { key: "requests", label: "Requests" },
              { key: "failures", label: "Failures" },
              { key: "estimated_cost_inr", label: "Est. cost", render: (r) => inr(r.estimated_cost_inr) },
            ]}
          />
        </Card>
      )}
    </>
  );
}
