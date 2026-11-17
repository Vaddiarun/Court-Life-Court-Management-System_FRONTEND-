import { useState } from "react";
import { useApi } from "../../lib/hooks";
import { Badge, Card, Input, Loading, PageHeader, Pagination, Select, Table } from "../../components/ui";
import { fmtDateTime } from "../../lib/format";

export function AuditTable({ path, showTenant }) {
  const [action, setAction] = useState("");
  const [tenant, setTenant] = useState("");
  const [offset, setOffset] = useState(0);
  const { data: firms } = useApi(["firms", "all"], "/admin/tenants", { limit: 200 }, { enabled: !!showTenant });
  const { data, isLoading } = useApi(["audit", path, action, tenant, offset], path, { action, tenant_id: tenant || undefined, limit: 25, offset });
  const firmName = Object.fromEntries((firms?.items || []).map((f) => [f.id, f.name]));

  return (
    <Card padded={false}>
      <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
        <Input className="max-w-xs" placeholder="Filter by action prefix, e.g. case. or auth." value={action} onChange={(e) => { setAction(e.target.value); setOffset(0); }} />
        {showTenant && (
          <Select className="max-w-xs" value={tenant} onChange={(e) => { setTenant(e.target.value); setOffset(0); }}>
            <option value="">All firms</option>
            {firms?.items?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        )}
      </div>
      {isLoading ? (
        <Loading />
      ) : (
        <Table
          rows={data.items}
          empty="No audit entries"
          columns={[
            { key: "created_at", label: "When", render: (r) => <span className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</span> },
            { key: "action", label: "Action", render: (r) => <Badge tone={r.action.includes("failed") ? "rose" : "brand"}>{r.action}</Badge> },
            ...(showTenant ? [{ key: "tenant", label: "Firm", render: (r) => <span className="text-xs">{firmName[r.tenant_id] || "Platform"}</span> }] : []),
            { key: "entity", label: "Entity", render: (r) => <span className="text-xs text-slate-500">{r.entity_type ? `${r.entity_type} · ${(r.entity_id || "").slice(0, 8)}` : "—"}</span> },
            { key: "details", label: "Details", render: (r) => <code className="block max-w-md truncate text-xs text-slate-500">{Object.keys(r.details || {}).length ? JSON.stringify(r.details) : "—"}</code> },
            { key: "ip_address", label: "IP", render: (r) => <span className="text-xs">{r.ip_address || "—"}</span> },
          ]}
        />
      )}
      {data && <Pagination total={data.total} limit={data.limit} offset={offset} onChange={setOffset} />}
    </Card>
  );
}

export default function AdminAudit() {
  return (
    <>
      <PageHeader title="Audit logs" subtitle="Every login, permission change and data change across the platform." />
      <AuditTable path="/admin/audit-logs" showTenant />
    </>
  );
}
