import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlarmClock, AlertTriangle, ArrowLeft, CalendarDays, CheckSquare, Download, FileText, History, Info, Pencil, Plus,
  RefreshCw, StickyNote, Trash2, Upload, UserMinus, Users,
} from "lucide-react";
import { del, download, patch, post, request } from "../../api/client";
import { useAction, useApi, useMembers } from "../../lib/hooks";
import { isManager, isStaff, ROLE_LABEL, useAuth } from "../../lib/auth";
import {
  Badge, Button, Card, Checkbox, EmptyState, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, StatusBadge, Table, Tabs, Textarea,
} from "../../components/ui";
import { HearingCountdown, MemberPicker, SourceNote } from "../../components/shared";
import { ReminderModal, TaskModal } from "../../components/forms";
import { fmtDate, fmtDateTime, timeAgo, titleCase } from "../../lib/format";

// ------------------------------------------------------------------ overview
function Overview({ c, user }) {
  const sync = useAction(() => post(`/cases/${c.id}/sync`), {
    success: (r) => (r.run.status === "failed" ? "Sync failed — see the error on this page" : r.run.changes ? `${r.run.changes} change(s) found` : "Already up to date"),
    invalidate: [["case", c.id], ["events", c.id], ["hearings-case", c.id], "dashboard"],
  });
  const people = (arr) => (arr?.length ? arr.join(", ") : "—");
  const rows = [
    ["CNR", c.cnr ? <span className="font-mono">{c.cnr}</span> : "—"],
    ["Case number", c.case_number],
    ["Case type", c.case_type],
    ["Court", c.court_name],
    ["Court level", c.court_level && titleCase(c.court_level)],
    ["State / district", [c.state, c.district].filter(Boolean).join(" / ")],
    ["Judge", c.judge],
    ["Petitioner(s)", people(c.petitioners)],
    ["Respondent(s)", people(c.respondents)],
    ["Advocates", people(c.advocates)],
    ["Filing date", fmtDate(c.filing_date)],
    ["Registration date", fmtDate(c.registration_date)],
  ].filter(([, v]) => v !== undefined);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Case details" className="lg:col-span-2">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        {c.description && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Description</p>
            {c.description}
          </div>
        )}
      </Card>
      <div className="space-y-6">
        <Card title="Next hearing">
          <p className="text-2xl font-bold text-slate-900">{fmtDate(c.next_hearing_date)}</p>
          <div className="mt-2"><HearingCountdown date={c.next_hearing_date} badgeOnly /></div>
          <p className="mt-3 text-sm text-slate-500">Stage: {c.stage || "—"}</p>
        </Card>
        <Card title="Court synchronisation">
          <SourceNote c={c} />
          {isStaff(user) && (
            <>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Auto sync</dt><dd>{c.sync_enabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Next scheduled</dt><dd>{c.next_sync_at ? fmtDateTime(c.next_sync_at) : "—"}</dd></div>
              </dl>
              {c.last_sync_error && (
                <div className="mt-3 flex gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertTriangle className="size-4 shrink-0" /> {c.last_sync_error}
                </div>
              )}
              {c.cnr && (
                <Button className="mt-4 w-full" variant="secondary" icon={RefreshCw} loading={sync.isPending} onClick={() => sync.mutate()}>
                  Sync now
                </Button>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function EditCaseModal({ c, open, onClose }) {
  const { data: members } = useMembers(undefined, { enabled: open });
  const [f, setF] = useState({
    title: c.title, case_number: c.case_number || "", court_name: c.court_name || "", judge: c.judge || "", status: c.status || "",
    stage: c.stage || "", next_hearing_date: c.next_hearing_date || "", description: c.description || "",
    lead_lawyer_id: c.lead_lawyer_id || "", sync_enabled: c.sync_enabled, is_disposed: c.is_disposed,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = useAction(
    () => patch(`/cases/${c.id}`, { ...f, lead_lawyer_id: f.lead_lawyer_id || null, next_hearing_date: f.next_hearing_date || null }),
    { success: "Case updated", invalidate: [["case", c.id], ["events", c.id], "cases"], onSuccess: onClose },
  );
  const leads = (members?.items || []).filter((m) => ["lawyer", "firm_admin"].includes(m.role));
  return (
    <Modal open={open} onClose={onClose} wide title="Edit case" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <ErrorBox error={save.error} className="mb-4" />
      {c.source === "provider" && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">This case is synced from the court data provider — official fields may be overwritten at the next sync.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2"><Input value={f.title} onChange={set("title")} /></Field>
        <Field label="Case number"><Input value={f.case_number} onChange={set("case_number")} /></Field>
        <Field label="Court"><Input value={f.court_name} onChange={set("court_name")} /></Field>
        <Field label="Judge"><Input value={f.judge} onChange={set("judge")} /></Field>
        <Field label="Status"><Input value={f.status} onChange={set("status")} /></Field>
        <Field label="Stage"><Input value={f.stage} onChange={set("stage")} /></Field>
        <Field label="Next hearing"><Input type="date" value={f.next_hearing_date} onChange={set("next_hearing_date")} /></Field>
        <Field label="Lead lawyer">
          <Select value={f.lead_lawyer_id} onChange={set("lead_lawyer_id")}>
            <option value="">Unassigned</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </Select>
        </Field>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <Checkbox label="Auto sync with court data" checked={f.sync_enabled} disabled={!c.cnr} onChange={(v) => setF({ ...f, sync_enabled: v })} />
          <Checkbox label="Case disposed" checked={f.is_disposed} onChange={(v) => setF({ ...f, is_disposed: v })} />
        </div>
        <Field label="Description" className="sm:col-span-2"><Textarea value={f.description} onChange={set("description")} /></Field>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ people
function PeopleTab({ c, user }) {
  const manager = isManager(user);
  const { data: staff } = useApi(["assignments", c.id], `/cases/${c.id}/assignments`);
  const { data: clients } = useApi(["case-clients", c.id], `/cases/${c.id}/clients`);
  const { data: members } = useMembers(undefined, { enabled: manager });
  const [addStaff, setAddStaff] = useState([]);
  const [addClients, setAddClients] = useState([]);
  const inv = [["assignments", c.id], ["case-clients", c.id]];
  const assign = useAction(() => post(`/cases/${c.id}/assignments`, { user_ids: addStaff }), { success: "Team updated", invalidate: inv, onSuccess: () => setAddStaff([]) });
  const grant = useAction(() => post(`/cases/${c.id}/clients`, { user_ids: addClients }), { success: "Client access granted", invalidate: inv, onSuccess: () => setAddClients([]) });
  const unassign = useAction((id) => del(`/cases/${c.id}/assignments/${id}`), { success: "Removed from case", invalidate: inv });
  const revoke = useAction((id) => del(`/cases/${c.id}/clients/${id}`), { success: "Client access revoked", invalidate: inv });

  const staffIds = new Set((staff || []).map((s) => s.id));
  const clientIds = new Set((clients || []).map((s) => s.id));
  const availStaff = (members?.items || []).filter((m) => ["lawyer", "junior_advocate", "firm_admin"].includes(m.role) && !staffIds.has(m.id));
  const availClients = (members?.items || []).filter((m) => m.role === "client" && !clientIds.has(m.id));

  const list = (rows, onRemove) =>
    !rows?.length ? (
      <p className="text-sm text-slate-400">Nobody yet.</p>
    ) : (
      <ul className="divide-y divide-slate-100">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium">{p.full_name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABEL[p.role]} · {p.email || p.phone}</p>
            </div>
            {manager && <Button size="sm" variant="ghost" icon={UserMinus} onClick={() => onRemove(p.id)}>Remove</Button>}
          </li>
        ))}
      </ul>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Assigned team">
        {list(staff, (id) => unassign.mutate(id))}
        {manager && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <MemberPicker members={availStaff} value={addStaff} onChange={setAddStaff} emptyText="Everyone is already assigned." />
            {addStaff.length > 0 && <Button size="sm" className="mt-3" loading={assign.isPending} onClick={() => assign.mutate()}>Assign {addStaff.length}</Button>}
          </div>
        )}
      </Card>
      <Card title="Clients with access">
        {list(clients, (id) => revoke.mutate(id))}
        {manager && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <MemberPicker members={availClients} value={addClients} onChange={setAddClients} emptyText="No other clients — add them under Clients & Team." />
            {addClients.length > 0 && <Button size="sm" className="mt-3" loading={grant.isPending} onClick={() => grant.mutate()}>Grant access</Button>}
          </div>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ hearings
function HearingsTab({ c, user }) {
  const { data, isLoading } = useApi(["hearings-case", c.id], `/hearings/case/${c.id}`);
  const [open, setOpen] = useState(false);
  const [reminderFor, setReminderFor] = useState(null);
  const [f, setF] = useState({ hearing_date: "", start_time: "", purpose: "", court_room: "", notes: "" });
  const add = useAction(
    () => post("/hearings", { case_id: c.id, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }),
    { success: "Hearing added", invalidate: [["hearings-case", c.id], "calendar", "dashboard"], onSuccess: () => { setOpen(false); setF({ hearing_date: "", start_time: "", purpose: "", court_room: "", notes: "" }); } },
  );
  const remove = useAction((id) => del(`/hearings/${id}`), { success: "Hearing removed", invalidate: [["hearings-case", c.id], "calendar"] });
  if (isLoading) return <Loading />;
  return (
    <Card
      title="Hearing history"
      padded={false}
      actions={isStaff(user) && <Button size="sm" icon={Plus} onClick={() => setOpen(true)}>Add manual entry</Button>}
    >
      <Table
        rows={data}
        empty="No hearings recorded"
        columns={[
          { key: "hearing_date", label: "Date", render: (h) => <HearingCountdown date={h.hearing_date} /> },
          { key: "purpose", label: "Purpose", render: (h) => <div><p>{h.purpose || "—"}</p>{h.notes && <p className="text-xs text-slate-400">{h.notes}</p>}</div> },
          { key: "judge", label: "Judge / room", render: (h) => <span className="text-xs">{[h.judge, h.court_room, h.start_time].filter(Boolean).join(" · ") || "—"}</span> },
          { key: "source", label: "Source", render: (h) => <StatusBadge value={h.source} /> },
          ...(isStaff(user)
            ? [{
                key: "a",
                label: "",
                render: (h) => (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" icon={AlarmClock} onClick={() => setReminderFor(h)}>Remind</Button>
                    {h.source === "manual" && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove.mutate(h.id)} />}
                  </div>
                ),
              }]
            : []),
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Add manual hearing entry" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={add.isPending} disabled={!f.hearing_date} onClick={() => add.mutate()}>Add</Button></>}>
        <p className="mb-4 text-xs text-slate-500">Manual entries are shown separately from officially sourced dates.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date"><Input type="date" value={f.hearing_date} onChange={(e) => setF({ ...f, hearing_date: e.target.value })} /></Field>
          <Field label="Time"><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></Field>
          <Field label="Purpose"><Input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></Field>
          <Field label="Court room"><Input value={f.court_room} onChange={(e) => setF({ ...f, court_room: e.target.value })} /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
      </Modal>
      <ReminderModal open={!!reminderFor} onClose={() => setReminderFor(null)} caseId={c.id} hearing={reminderFor} />
    </Card>
  );
}

// ------------------------------------------------------------------ history
function HistoryTab({ c, user }) {
  const { data: events, isLoading } = useApi(["events", c.id], `/cases/${c.id}/events`);
  const { data: runs } = useApi(["sync-runs", c.id], `/cases/${c.id}/sync-runs`, undefined, { enabled: isStaff(user) });
  if (isLoading) return <Loading />;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Change history" className="lg:col-span-2">
        {!events.length ? (
          <EmptyState icon={History} title="No changes recorded yet">Changes detected by court sync or manual edits appear here.</EmptyState>
        ) : (
          <ol className="relative space-y-5 border-l border-slate-200 pl-5">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[26px] top-1 size-3 rounded-full ring-4 ring-white ${e.source === "manual" ? "bg-sky-500" : "bg-brand-600"}`} />
                <p className="text-sm font-medium text-slate-800">{titleCase(e.event_type)}</p>
                {e.field ? (
                  <p className="mt-0.5 text-sm text-slate-600">
                    <span className="text-slate-400 line-through">{e.old_value || "—"}</span> → <span className="font-medium">{e.new_value || "—"}</span>
                  </p>
                ) : (
                  e.new_value && <p className="mt-0.5 text-sm text-slate-600">{e.new_value}</p>
                )}
                <p className="mt-0.5 text-xs text-slate-400">{fmtDateTime(e.created_at)} · {e.source}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
      {isStaff(user) && (
        <Card title="Sync runs" padded={false}>
          {!runs?.length ? (
            <EmptyState title="No sync runs" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {runs.map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <StatusBadge value={r.status} />
                    <span className="text-xs text-slate-400">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{titleCase(r.trigger)} · {r.changes} change(s)</p>
                  {r.error && <p className="mt-1 text-xs text-rose-600">{r.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ documents
const DOC_CATS = ["petition", "order", "evidence", "affidavit", "correspondence", "invoice", "other"];

function DocumentsTab({ c, user }) {
  const fileRef = useRef(null);
  const [cat, setCat] = useState("other");
  const [share, setShare] = useState(false);
  const { data, isLoading } = useApi(["documents", c.id], `/cases/${c.id}/documents`);
  const upload = useAction(
    (file) => {
      const form = new FormData();
      form.append("file", file);
      form.append("category", cat);
      form.append("shared_with_client", share ? "true" : "false");
      return request("POST", `/cases/${c.id}/documents`, { form });
    },
    { success: (d) => `${d.filename} uploaded`, invalidate: [["documents", c.id]] },
  );
  const toggleShare = useAction((d) => patch(`/documents/${d.id}`, { shared_with_client: !d.shared_with_client }), { success: "Sharing updated", invalidate: [["documents", c.id]] });
  const remove = useAction((id) => del(`/documents/${id}`), { success: "Document deleted", invalidate: [["documents", c.id]] });
  const staff = isStaff(user);

  return (
    <Card
      title="Documents"
      padded={false}
      actions={
        staff && (
          <div className="flex flex-wrap items-center gap-2">
            <Select className="!w-36 !py-1.5 text-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
              {DOC_CATS.map((x) => <option key={x} value={x}>{titleCase(x)}</option>)}
            </Select>
            <Checkbox label="Share with client" checked={share} onChange={setShare} />
            <input ref={fileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => { const f = e.target.files[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
            <Button size="sm" icon={Upload} loading={upload.isPending} onClick={() => fileRef.current.click()}>Upload</Button>
          </div>
        )
      }
    >
      {isLoading ? (
        <Loading />
      ) : (
        <Table
          rows={data}
          empty={staff ? "No documents yet — upload petitions, orders, evidence…" : "No documents have been shared with you yet"}
          columns={[
            { key: "filename", label: "File", render: (d) => (<div className="flex items-center gap-2"><FileText className="size-4 text-brand-500" /><div><p className="font-medium">{d.filename}</p><p className="text-xs text-slate-400">{(d.size_bytes / 1024).toFixed(1)} KB</p></div></div>) },
            { key: "category", label: "Category", render: (d) => <Badge>{titleCase(d.category)}</Badge> },
            ...(staff ? [{ key: "shared", label: "Client access", render: (d) => <button onClick={() => toggleShare.mutate(d)}><Badge tone={d.shared_with_client ? "green" : "slate"}>{d.shared_with_client ? "Shared" : "Private"}</Badge></button> }] : []),
            { key: "created_at", label: "Uploaded", render: (d) => <span className="text-xs">{fmtDateTime(d.created_at)}</span> },
            {
              key: "a",
              label: "",
              render: (d) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" icon={Download} onClick={() => download(`/documents/${d.id}/download`, d.filename)}>Download</Button>
                  {staff && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => confirm(`Delete ${d.filename}?`) && remove.mutate(d.id)} />}
                </div>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ notes
function NotesTab({ c, user }) {
  const { data, isLoading } = useApi(["notes", c.id], `/cases/${c.id}/notes`);
  const levels = user.role === "junior_advocate" ? ["team", "client"] : ["internal", "team", "client"];
  const [body, setBody] = useState("");
  const [vis, setVis] = useState(levels[0]);
  const add = useAction(() => post(`/cases/${c.id}/notes`, { body, visibility: vis }), { success: "Note added", invalidate: [["notes", c.id]], onSuccess: () => setBody("") });
  const remove = useAction((id) => del(`/notes/${id}`), { success: "Note deleted", invalidate: [["notes", c.id]] });
  const help = { internal: "Firm admins & lawyers only", team: "+ assigned junior advocates", client: "+ clients on this case" };
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {isLoading ? <Loading /> : !data.length ? <Card><EmptyState icon={StickyNote} title="No notes" /></Card> : data.map((n) => (
          <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-wrap text-sm text-slate-800">{n.body}</p>
              {isStaff(user) && (n.author_id === user.id || user.role === "firm_admin") && (
                <button className="text-slate-300 hover:text-rose-500" onClick={() => remove.mutate(n.id)}><Trash2 className="size-4" /></button>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <StatusBadge value={n.visibility} /> {fmtDateTime(n.created_at)}
            </div>
          </div>
        ))}
      </div>
      {isStaff(user) && (
        <Card title="Add note">
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a note…" />
          <Field label="Visible to" className="mt-3" hint={help[vis]}>
            <Select value={vis} onChange={(e) => setVis(e.target.value)}>
              {levels.map((l) => <option key={l} value={l}>{titleCase(l)}</option>)}
            </Select>
          </Field>
          <Button className="mt-4 w-full" disabled={!body.trim()} loading={add.isPending} onClick={() => add.mutate()}>Add note</Button>
        </Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ tasks & reminders
function TasksTab({ c }) {
  const { data } = useApi(["tasks", "case", c.id], "/tasks", { case_id: c.id, limit: 100 });
  const [open, setOpen] = useState(false);
  const setStatus = useAction(({ id, status }) => patch(`/tasks/${id}`, { status }), { invalidate: ["tasks"] });
  return (
    <Card title="Tasks" padded={false} actions={<Button size="sm" icon={Plus} onClick={() => setOpen(true)}>New task</Button>}>
      <Table
        rows={data?.items}
        empty="No tasks on this case"
        columns={[
          { key: "title", label: "Task", render: (t) => <div><p className="font-medium">{t.title}</p>{t.description && <p className="text-xs text-slate-500">{t.description}</p>}</div> },
          { key: "due_at", label: "Due", render: (t) => fmtDateTime(t.due_at) },
          {
            key: "status",
            label: "Status",
            render: (t) => (
              <Select className="!w-36 !py-1 text-xs" value={t.status} onChange={(e) => setStatus.mutate({ id: t.id, status: e.target.value })}>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </Select>
            ),
          },
        ]}
      />
      <TaskModal open={open} onClose={() => setOpen(false)} caseId={c.id} />
    </Card>
  );
}

function RemindersTab({ c }) {
  const { data } = useApi(["reminders", "case", c.id], "/reminders", { case_id: c.id, active: true, limit: 100 });
  const [open, setOpen] = useState(false);
  return (
    <Card title="Reminders" padded={false} actions={<Button size="sm" icon={Plus} onClick={() => setOpen(true)}>New reminder</Button>}>
      <Table
        rows={data?.items}
        empty="No active reminders"
        columns={[
          { key: "title", label: "Reminder", render: (r) => <div><p className="font-medium">{r.title}</p>{r.auto_generated && <Badge tone="violet">auto</Badge>}</div> },
          { key: "event_at", label: "Event", render: (r) => fmtDateTime(r.event_at) },
          { key: "offsets", label: "When", render: (r) => <span className="text-xs">{r.offsets_days.map((o) => (o ? `${o}d` : "day of")).join(", ")}</span> },
          { key: "channels", label: "Channels", render: (r) => <div className="flex flex-wrap gap-1">{r.channels.map((ch) => <Badge key={ch} tone="sky">{titleCase(ch)}</Badge>)}</div> },
          { key: "recipients", label: "Recipients", render: (r) => r.recipient_ids.length },
        ]}
      />
      <ReminderModal open={open} onClose={() => setOpen(false)} caseId={c.id} />
    </Card>
  );
}

// ------------------------------------------------------------------ page
export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const { data: c, isLoading, error } = useApi(["case", id], `/cases/${id}`);
  const remove = useAction(() => del(`/cases/${id}`), { success: "Case deleted", invalidate: ["cases", "dashboard"], onSuccess: () => navigate("/cases") });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const staff = isStaff(user);
  const tabs = [
    { value: "overview", label: "Overview", icon: Info },
    ...(staff ? [{ value: "people", label: "People", icon: Users }] : []),
    { value: "hearings", label: "Hearings", icon: CalendarDays },
    { value: "history", label: "History", icon: History },
    { value: "documents", label: "Documents", icon: FileText },
    { value: "notes", label: "Notes", icon: StickyNote },
    ...(staff ? [{ value: "tasks", label: "Tasks", icon: CheckSquare }, { value: "reminders", label: "Reminders", icon: AlarmClock }] : []),
  ];
  const canDelete = user.role === "firm_admin" || (user.role === "lawyer" && c.lead_lawyer_id === user.id);

  return (
    <>
      <Link to="/cases" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Cases
      </Link>
      <PageHeader
        title={c.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {c.case_number && <span>{c.case_number}</span>}
            {c.court_name && <span>· {c.court_name}</span>}
            <Badge tone={c.is_disposed ? "slate" : "green"}>{c.status || "—"}</Badge>
            <StatusBadge value={c.source} />
          </span>
        }
        actions={
          isManager(user) && (
            <>
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
              {canDelete && <Button variant="ghost" icon={Trash2} onClick={() => confirm("Delete this case and all its documents, notes and reminders?") && remove.mutate()} />}
            </>
          )
        }
      />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "overview" && <Overview c={c} user={user} />}
      {tab === "people" && <PeopleTab c={c} user={user} />}
      {tab === "hearings" && <HearingsTab c={c} user={user} />}
      {tab === "history" && <HistoryTab c={c} user={user} />}
      {tab === "documents" && <DocumentsTab c={c} user={user} />}
      {tab === "notes" && <NotesTab c={c} user={user} />}
      {tab === "tasks" && <TasksTab c={c} />}
      {tab === "reminders" && <RemindersTab c={c} />}
      {editing && <EditCaseModal c={c} open={editing} onClose={() => setEditing(false)} />}
    </>
  );
}
