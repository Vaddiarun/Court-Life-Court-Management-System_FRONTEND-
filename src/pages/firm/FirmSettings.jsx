import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { patch } from "../../api/client";
import { useAction, useApi, useLanguages } from "../../lib/hooks";
import { Badge, Button, Card, Checkbox, Field, Input, Loading, PageHeader, Select, Tabs, Textarea } from "../../components/ui";
import { AuditTable } from "../admin/AdminAudit";
import { fmtDate, titleCase } from "../../lib/format";

const OFFSETS = [7, 3, 1, 0];
const CHANNELS = ["in_app", "email", "sms", "call"];

function Settings() {
  const { data: firm, isLoading } = useApi("firm", "/firm");
  const { data: langs } = useLanguages();
  const [f, setF] = useState(null);

  useEffect(() => {
    if (!firm) return;
    const s = firm.settings || {};
    setF({
      name: firm.name,
      default_language: firm.default_language,
      contact_email: firm.contact_email || "",
      contact_phone: firm.contact_phone || "",
      address: firm.address || "",
      auto_hearing_reminders: s.auto_hearing_reminders ?? true,
      auto_reminders_include_clients: s.auto_reminders_include_clients ?? true,
      auto_reminder_offsets: s.auto_reminder_offsets ?? [3, 1, 0],
      auto_reminder_channels: s.auto_reminder_channels ?? ["in_app"],
    });
  }, [firm]);

  const save = useAction(
    () =>
      patch("/firm", {
        name: f.name,
        default_language: f.default_language,
        contact_email: f.contact_email || null,
        contact_phone: f.contact_phone || null,
        address: f.address || null,
        settings: {
          auto_hearing_reminders: f.auto_hearing_reminders,
          auto_reminders_include_clients: f.auto_reminders_include_clients,
          auto_reminder_offsets: f.auto_reminder_offsets,
          auto_reminder_channels: f.auto_reminder_channels,
        },
      }),
    { success: "Firm settings saved", invalidate: ["firm"] },
  );

  if (isLoading || !f) return <Loading />;
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card title="Firm profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Firm name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Default language">
              <Select value={f.default_language} onChange={(e) => setF({ ...f, default_language: e.target.value })}>
                {langs?.map((l) => <option key={l.code} value={l.code}>{l.name} — {l.native}</option>)}
              </Select>
            </Field>
            <Field label="Contact email"><Input value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></Field>
            <Field label="Contact phone"><Input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></Field>
            <Field label="Address" className="sm:col-span-2"><Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          </div>
        </Card>
        <Card title="Automatic hearing reminders">
          <p className="mb-4 text-sm text-slate-500">When court sync finds a new next-hearing date, Court Life creates a reminder for the lead lawyer, assigned team and firm admins.</p>
          <div className="space-y-4">
            <Checkbox label="Create hearing reminders automatically" checked={f.auto_hearing_reminders} onChange={(v) => setF({ ...f, auto_hearing_reminders: v })} />
            <Checkbox label="Include clients on the case" checked={f.auto_reminders_include_clients} onChange={(v) => setF({ ...f, auto_reminders_include_clients: v })} />
            <Field as="div" label="Remind">
              <div className="flex flex-wrap gap-4">
                {OFFSETS.map((o) => <Checkbox key={o} label={o ? `${o} day${o > 1 ? "s" : ""} before` : "On the day"} checked={f.auto_reminder_offsets.includes(o)} onChange={() => toggle("auto_reminder_offsets", o)} />)}
              </div>
            </Field>
            <Field as="div" label="Channels">
              <div className="flex flex-wrap gap-4">
                {CHANNELS.map((c) => <Checkbox key={c} label={titleCase(c)} checked={f.auto_reminder_channels.includes(c)} onChange={() => toggle("auto_reminder_channels", c)} />)}
              </div>
            </Field>
          </div>
        </Card>
        <div className="flex justify-end">
          <Button icon={Save} loading={save.isPending} onClick={() => save.mutate()}>Save settings</Button>
        </div>
      </div>
      <Card title="Subscription">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Plan</dt><dd><Badge tone="brand">{titleCase(firm.plan)}</Badge></dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><Badge tone={firm.status === "active" ? "green" : "rose"}>{firm.status}</Badge></dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Court API allowance</dt><dd>{firm.monthly_api_allowance.toLocaleString()}/mo</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Call allowance</dt><dd>{firm.monthly_call_allowance} min/mo</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Renews / ends</dt><dd>{fmtDate(firm.subscription_ends_at)}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-slate-400">Plan and allowances are managed by the platform administrator.</p>
      </Card>
    </div>
  );
}

export default function FirmSettings() {
  const [tab, setTab] = useState("settings");
  return (
    <>
      <PageHeader title="Firm settings" subtitle="Profile, reminder defaults and audit history." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "settings", label: "Settings" }, { value: "audit", label: "Audit log" }]} />
      {tab === "settings" ? <Settings /> : <AuditTable path="/firm/audit-logs" />}
    </>
  );
}
