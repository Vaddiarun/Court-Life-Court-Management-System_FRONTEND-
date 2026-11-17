import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { post } from "../../api/client";
import { useAction, useApi, useLanguages } from "../../lib/hooks";
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader, Pagination, Select, StatusBadge, Table } from "../../components/ui";
import { fmtDate, titleCase } from "../../lib/format";

export const PLANS = ["individual", "small_firm", "professional", "enterprise"];

function CreateFirmModal({ open, onClose }) {
  const navigate = useNavigate();
  const { data: langs } = useLanguages();
  const empty = {
    name: "", slug: "", plan: "small_firm", default_language: "en", contact_email: "", contact_phone: "",
    monthly_api_allowance: 5000, monthly_call_allowance: 500, admin_name: "", admin_phone: "", admin_email: "",
  };
  const [f, setF] = useState(empty);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = useAction(
    () => {
      const body = { ...f, monthly_api_allowance: +f.monthly_api_allowance, monthly_call_allowance: +f.monthly_call_allowance };
      ["contact_email", "contact_phone", "admin_email"].forEach((k) => !body[k] && delete body[k]);
      return post("/admin/tenants", body);
    },
    {
      success: (t) => `${t.name} created`,
      invalidate: ["firms", "admin-overview"],
      onSuccess: (t) => {
        setF(empty);
        onClose();
        navigate(`/admin/firms/${t.id}`);
      },
    },
  );
  const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Onboard a new law firm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} onClick={() => create.mutate()}>Create firm</Button>
        </>
      }
    >
      <ErrorBox error={create.error} className="mb-4" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Firm name">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) })} placeholder="Rao & Partners" />
        </Field>
        <Field label="Workspace slug" hint="lowercase letters, numbers, dashes">
          <Input value={f.slug} onChange={set("slug")} placeholder="rao-partners" />
        </Field>
        <Field label="Plan">
          <Select value={f.plan} onChange={set("plan")}>
            {PLANS.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
          </Select>
        </Field>
        <Field label="Default language">
          <Select value={f.default_language} onChange={set("default_language")}>
            {langs?.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Contact email"><Input type="email" value={f.contact_email} onChange={set("contact_email")} /></Field>
        <Field label="Contact phone"><Input value={f.contact_phone} onChange={set("contact_phone")} /></Field>
        <Field label="Monthly court API allowance" hint="Requests included before overage">
          <Input type="number" min={0} value={f.monthly_api_allowance} onChange={set("monthly_api_allowance")} />
        </Field>
        <Field label="Monthly call allowance" hint="Billable minutes">
          <Input type="number" min={0} value={f.monthly_call_allowance} onChange={set("monthly_call_allowance")} />
        </Field>
      </div>
      <h4 className="mb-3 mt-6 text-sm font-semibold text-slate-800">First firm admin</h4>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Name"><Input value={f.admin_name} onChange={set("admin_name")} /></Field>
        <Field label="Mobile number" hint="Signs in with OTP"><Input value={f.admin_phone} onChange={set("admin_phone")} placeholder="98123 45678" /></Field>
        <Field label="Email (optional)"><Input type="email" value={f.admin_email} onChange={set("admin_email")} /></Field>
      </div>
    </Modal>
  );
}

export default function Firms() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useApi(["firms", q, status, offset], "/admin/tenants", { q, status, limit: 20, offset });

  return (
    <>
      <PageHeader title="Law firms" subtitle="Tenants on the platform, their plans and allowances." actions={<Button icon={Plus} onClick={() => setOpen(true)}>New law firm</Button>} />
      <Card padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search by name or slug" value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} />
          </div>
          <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        {isLoading ? (
          <Loading />
        ) : (
          <Table
            rows={data.items}
            onRowClick={(r) => navigate(`/admin/firms/${r.id}`)}
            empty="No law firms yet — onboard the first one."
            columns={[
              { key: "name", label: "Firm", render: (r) => (<div><p className="font-semibold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.slug}</p></div>) },
              { key: "plan", label: "Plan", render: (r) => <Badge tone="brand">{titleCase(r.plan)}</Badge> },
              { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
              { key: "allow", label: "Allowances", render: (r) => <span className="text-xs text-slate-500">{r.monthly_api_allowance.toLocaleString()} API · {r.monthly_call_allowance} call min</span> },
              { key: "sub", label: "Subscription ends", render: (r) => fmtDate(r.subscription_ends_at) },
              { key: "created_at", label: "Created", render: (r) => fmtDate(r.created_at) },
            ]}
          />
        )}
        {data && <Pagination total={data.total} limit={data.limit} offset={offset} onChange={setOffset} />}
      </Card>
      <CreateFirmModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
