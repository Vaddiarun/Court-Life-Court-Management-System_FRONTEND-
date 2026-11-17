import { useState } from "react";
import { useApi } from "../../lib/hooks";
import { Card, Field, Input, Loading, PageHeader, Select, StatCard, Table } from "../../components/ui";
import { inr, titleCase } from "../../lib/format";

export function UsageView({ path, extraParams = {}, showTenant }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [tenant, setTenant] = useState("");
  const [y, m] = month.split("-").map(Number);
  const { data: firms } = useApi(["firms", "all"], "/admin/tenants", { limit: 200 }, { enabled: !!showTenant });
  const { data, isLoading } = useApi(["usage", path, month, tenant], path, { year: y, month: m, tenant_id: tenant || undefined, ...extraParams });

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-4">
        <Field label="Month" className="w-48">
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        {showTenant && (
          <Field label="Law firm" className="w-72">
            <Select value={tenant} onChange={(e) => setTenant(e.target.value)}>
              <option value="">All firms</option>
              {firms?.items?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
        )}
      </div>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Court API requests" value={data.court_api_requests.toLocaleString()} />
            <StatCard label="Call minutes" value={data.call_minutes} tone="sky" />
            <StatCard label="Estimated cost" value={inr(data.estimated_total_inr)} tone="green" hint="Indicative Enterprise rate card, excl. GST" />
          </div>
          <Card title="Breakdown" className="mt-6" padded={false}>
            <Table
              rowKey={(r) => r.provider + r.operation}
              rows={data.items}
              empty="No usage recorded for this month"
              columns={[
                { key: "provider", label: "Provider" },
                { key: "operation", label: "Operation", render: (r) => titleCase(r.operation) },
                { key: "requests", label: "Requests" },
                { key: "units", label: "Units" },
                { key: "failures", label: "Failures" },
                { key: "estimated_cost_inr", label: "Estimated cost", render: (r) => <span className="font-semibold">{inr(r.estimated_cost_inr)}</span> },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}

export default function AdminUsage() {
  return (
    <>
      <PageHeader title="Usage & billing" subtitle="Third-party consumption metered per firm — court data API, calls, SMS and email." />
      <UsageView path="/admin/usage" showTenant />
    </>
  );
}
