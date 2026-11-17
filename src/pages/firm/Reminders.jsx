import { useState } from "react";
import { Link } from "react-router-dom";
import { AlarmClock, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { del, get, patch } from "../../api/client";
import { useAction, useApi } from "../../lib/hooks";
import { Badge, Button, Card, EmptyState, Loading, Modal, PageHeader, Select, StatusBadge, Table } from "../../components/ui";
import { ReminderModal } from "../../components/forms";
import { fmtDateTime, titleCase } from "../../lib/format";
import { useQuery } from "@tanstack/react-query";

function JobsModal({ reminder, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reminder-jobs", reminder?.id],
    queryFn: () => get(`/reminders/${reminder.id}/jobs`),
    enabled: !!reminder,
  });
  return (
    <Modal open={!!reminder} onClose={onClose} wide title={`Delivery schedule — ${reminder?.title || ""}`}>
      {isLoading ? (
        <Loading />
      ) : (
        <Table
          rows={data}
          empty="No deliveries scheduled (all times may be in the past)"
          columns={[
            { key: "scheduled_at", label: "Scheduled", render: (j) => fmtDateTime(j.scheduled_at) },
            { key: "channel", label: "Channel", render: (j) => <Badge tone="sky">{titleCase(j.channel)}</Badge> },
            { key: "status", label: "Status", render: (j) => <StatusBadge value={j.status} /> },
            { key: "attempts", label: "Attempts" },
            { key: "last_error", label: "Note", render: (j) => <span className="text-xs text-slate-500">{j.last_error || "—"}</span> },
          ]}
        />
      )}
    </Modal>
  );
}

export default function Reminders() {
  const [active, setActive] = useState("true");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [jobsFor, setJobsFor] = useState(null);
  const { data, isLoading } = useApi(["reminders", active], "/reminders", { active: active === "" ? undefined : active, limit: 200 });
  const { data: stats } = useApi(["reminders", "stats"], "/reminders/stats/summary");
  const toggle = useAction((r) => patch(`/reminders/${r.id}`, { is_active: !r.is_active }), { success: "Reminder updated", invalidate: ["reminders"] });
  const remove = useAction((id) => del(`/reminders/${id}`), { success: "Reminder deleted", invalidate: ["reminders"] });

  return (
    <>
      <PageHeader
        title="Reminders"
        subtitle="Hearing, filing, payment and custom reminders delivered in-app, by email, SMS or voice call."
        actions={
          <>
            <Select className="w-36" value={active} onChange={(e) => setActive(e.target.value)}>
              <option value="true">Active</option>
              <option value="false">Paused</option>
              <option value="">All</option>
            </Select>
            <Button icon={Plus} onClick={() => setCreating(true)}>New reminder</Button>
          </>
        }
      />
      {stats && Object.keys(stats).length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats).map(([ch, st]) => (
            <div key={ch} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">{titleCase(ch)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(st).map(([s, n]) => <Badge key={s} tone={s === "sent" ? "green" : s === "failed" ? "rose" : s === "pending" ? "amber" : "slate"}>{s}: {n}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      )}
      <Card padded={false}>
        {isLoading ? (
          <Loading />
        ) : !data.items.length ? (
          <EmptyState icon={AlarmClock} title="No reminders" action={<Button icon={Plus} onClick={() => setCreating(true)}>Create one</Button>} />
        ) : (
          <Table
            rows={data.items}
            columns={[
              {
                key: "title",
                label: "Reminder",
                render: (r) => (
                  <div>
                    <p className="font-medium text-slate-900">{r.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge>{titleCase(r.reminder_type)}</Badge>
                      {r.auto_generated && <Badge tone="violet">auto from sync</Badge>}
                      {r.case_id && <Link to={`/cases/${r.case_id}`} className="text-xs text-brand-600 hover:underline">open case</Link>}
                    </div>
                  </div>
                ),
              },
              { key: "event_at", label: "Event", render: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.event_at)}</span> },
              { key: "offsets", label: "Remind", render: (r) => <span className="text-xs">{r.offsets_days.map((o) => (o ? `${o}d before` : "day of")).join(", ") || "custom"}</span> },
              { key: "channels", label: "Channels", render: (r) => <div className="flex flex-wrap gap-1">{r.channels.map((c) => <Badge key={c} tone="sky">{titleCase(c)}</Badge>)}</div> },
              { key: "recipients", label: "People", render: (r) => r.recipient_ids.length },
              {
                key: "a",
                label: "",
                render: (r) => (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" icon={ListChecks} onClick={() => setJobsFor(r)}>Schedule</Button>
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(r)} />
                    <Button size="sm" variant="ghost" onClick={() => toggle.mutate(r)}>{r.is_active ? "Pause" : "Resume"}</Button>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => confirm("Delete this reminder?") && remove.mutate(r.id)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
      <ReminderModal open={creating} onClose={() => setCreating(false)} />
      <ReminderModal open={!!editing} existing={editing} onClose={() => setEditing(null)} />
      <JobsModal reminder={jobsFor} onClose={() => setJobsFor(null)} />
    </>
  );
}
