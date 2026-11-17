import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, PhoneCall, Save } from "lucide-react";
import { get, patch, post } from "../api/client";
import { ROLE_LABEL, useAuth } from "../lib/auth";
import { useAction, useLanguages } from "../lib/hooks";
import { Badge, Button, Card, Checkbox, Field, Input, PageHeader, Select } from "../components/ui";
import { fmtDateTime } from "../lib/format";

export default function Profile() {
  const { user, setUser } = useAuth();
  const { data: langs } = useLanguages();
  const [form, setForm] = useState({
    full_name: user.full_name,
    phone: user.phone || "",
    language: user.language,
    notify_in_app: user.notify_in_app,
    notify_email: user.notify_email,
    notify_sms: user.notify_sms,
    notify_call: user.notify_call,
    sms_consent: !!user.sms_consent_at,
    call_consent: !!user.call_consent_at,
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = useAction(
    () => {
      const body = { ...form };
      if (!body.phone) delete body.phone;
      if (body.sms_consent === !!user.sms_consent_at) delete body.sms_consent;
      if (body.call_consent === !!user.call_consent_at) delete body.call_consent;
      return patch("/auth/me", body);
    },
    { success: "Preferences saved", onSuccess: setUser },
  );
  const testCall = useAction(() => post("/auth/me/test-call"), {
    success: (r) => `Calling ${r.to} now via ${r.provider}…`,
  });
  const testEmail = useAction(() => post("/auth/me/test-email"), {
    success: (r) => (r.provider === "mock" ? "Email is in demo mode on this server — nothing was sent" : `Test email sent to ${r.to}`),
  });
  const { data: channels } = useQuery({ queryKey: ["me", "channels"], queryFn: () => get("/auth/me/channels"), staleTime: 60_000 });
  const live = (v) => v && v !== "mock" && v !== "local";

  return (
    <>
      <PageHeader title="Profile & preferences" subtitle="Your language and how Court Life reaches you." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Account" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} />
            </Field>
            <Field label="Mobile number" hint="You sign in with this number; SMS and calls go here">
              <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="98123 45678" />
            </Field>
            <Field label="Language" hint="Used for notifications, SMS and voice reminders">
              <Select value={form.language} onChange={(e) => set("language")(e.target.value)}>
                {langs?.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} — {l.native}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Email">
              <Input value={user.email || "—"} disabled />
            </Field>
          </div>

          <h4 className="mt-6 text-sm font-semibold text-slate-800">Notification channels</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Checkbox label="In-app notifications" checked={form.notify_in_app} onChange={set("notify_in_app")} />
            <Checkbox label="Email" checked={form.notify_email} onChange={set("notify_email")} />
            <Checkbox label="SMS" checked={form.notify_sms} onChange={set("notify_sms")} />
            <Checkbox label="Automated voice calls" checked={form.notify_call} onChange={set("notify_call")} />
          </div>
          <h4 className="mt-6 text-sm font-semibold text-slate-800">Consent</h4>
          <p className="mt-1 text-xs text-slate-500">SMS and voice reminders are only sent after you give consent (Indian telecom rules).</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Checkbox label="I agree to receive SMS reminders" checked={form.sms_consent} onChange={set("sms_consent")} />
            <Checkbox label="I agree to receive automated reminder calls" checked={form.call_consent} onChange={set("call_consent")} />
          </div>
          <div className="mt-6 flex justify-end">
            <Button icon={Save} loading={save.isPending} onClick={() => save.mutate()}>
              Save preferences
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Your role">
            <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">SMS consent</dt>
                <dd>{user.sms_consent_at ? fmtDateTime(user.sms_consent_at) : "Not given"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Call consent</dt>
                <dd>{user.call_consent_at ? fmtDateTime(user.call_consent_at) : "Not given"}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Reminder calls">
            <p className="text-sm text-slate-500">
              Hear what an automated reminder call sounds like. We'll call <span className="font-medium text-slate-700">{user.phone || "your mobile"}</span> right now in your
              language.
            </p>
            <Button className="mt-4 w-full" variant="secondary" icon={PhoneCall} loading={testCall.isPending} disabled={!user.phone} onClick={() => testCall.mutate()}>
              Test call now
            </Button>
            <p className="mt-3 text-xs text-slate-400">Scheduled reminder calls need "Automated voice calls" switched on and call consent given above.</p>
          </Card>
          <Card title="Reminder emails">
            <p className="text-sm text-slate-500">
              Send a test email to <span className="font-medium text-slate-700">{user.email || "your email"}</span>.
            </p>
            <Button className="mt-4 w-full" variant="secondary" icon={Mail} loading={testEmail.isPending} disabled={!user.email} onClick={() => testEmail.mutate()}>
              Send test email
            </Button>
          </Card>
          {channels && (
            <Card title="Delivery channels on this server">
              <dl className="space-y-2 text-sm">
                {[
                  ["Login OTP", channels.otp],
                  ["SMS", channels.sms],
                  ["Voice calls", channels.voice],
                  ["Email", channels.email],
                ].map(([label, v]) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-slate-500">{label}</dt>
                    <dd>
                      <Badge tone={live(v) ? "green" : "slate"}>{live(v) ? `Live · ${v}` : "Demo mode"}</Badge>
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
