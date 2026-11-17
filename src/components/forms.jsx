import { useEffect, useState } from "react";
import { patch, post } from "../api/client";
import { useAction, useApi, useMembers } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { Button, Checkbox, ErrorBox, Field, Input, Modal, Select, Textarea } from "./ui";
import { MemberPicker } from "./shared";
import { titleCase, toLocalInput } from "../lib/format";

const REMINDER_TYPES = ["hearing", "preparation", "filing", "document_submission", "client_meeting", "follow_up", "payment", "custom"];
const CHANNELS = [
  ["in_app", "In-app"],
  ["email", "Email"],
  ["sms", "SMS"],
  ["call", "Voice call"],
];
const OFFSETS = [7, 3, 1, 0];

export function ReminderModal({ open, onClose, caseId, hearing, existing }) {
  const { user } = useAuth();
  const isJunior = user.role === "junior_advocate";
  const { data: members } = useMembers(undefined, { enabled: open && !isJunior });
  const { data: cases } = useApi(["cases", "picker"], "/cases", { limit: 200, disposed: false }, { enabled: open && !caseId && !existing });
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(10, 30, 0, 0);

  const blank = {
    title: hearing ? `Hearing: ${hearing.purpose || "listed"}` : "",
    reminder_type: hearing ? "hearing" : "custom",
    message: "",
    case_id: caseId || "",
    event_at: toLocalInput(tomorrow),
    offsets_days: [3, 1, 0],
    custom_time: "",
    channels: ["in_app"],
    recipient_ids: [],
    include_case_clients: false,
  };
  const [f, setF] = useState(blank);

  useEffect(() => {
    if (!open) return;
    if (existing)
      setF({
        ...blank,
        title: existing.title,
        reminder_type: existing.reminder_type,
        message: existing.message || "",
        case_id: existing.case_id || "",
        event_at: toLocalInput(new Date(existing.event_at)),
        offsets_days: existing.offsets_days,
        custom_time: existing.custom_times?.[0] ? toLocalInput(new Date(existing.custom_times[0])) : "",
        channels: existing.channels,
        recipient_ids: existing.recipient_ids,
      });
    else setF(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  const toggle = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((i) => i !== v) : [...x[k], v] }));
  const staffAndClients = (members?.items || []).filter((m) => m.role !== "client" || f.case_id);

  const save = useAction(
    () => {
      const body = {
        title: f.title,
        message: f.message || null,
        event_at: new Date(f.event_at).toISOString(),
        offsets_days: f.offsets_days,
        custom_times: f.custom_time ? [new Date(f.custom_time).toISOString()] : [],
        channels: f.channels,
        recipient_ids: f.recipient_ids,
      };
      if (existing) return patch(`/reminders/${existing.id}`, body);
      return post("/reminders", {
        ...body,
        reminder_type: f.reminder_type,
        case_id: f.case_id || null,
        hearing_id: hearing?.id || null,
        include_case_clients: f.include_case_clients,
      });
    },
    { success: existing ? "Reminder updated" : "Reminder scheduled", invalidate: ["reminders", "dashboard"], onSuccess: onClose },
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={existing ? "Edit reminder" : "New reminder"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => save.mutate()} disabled={!f.title || !f.channels.length || (!f.offsets_days.length && !f.custom_time)}>
            {existing ? "Save" : "Schedule reminder"}
          </Button>
        </>
      }
    >
      <ErrorBox error={save.error} className="mb-4" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="File written statement" /></Field>
        {!existing && (
          <Field label="Type">
            <Select value={f.reminder_type} onChange={(e) => setF({ ...f, reminder_type: e.target.value })}>
              {REMINDER_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Event date & time">
          <Input type="datetime-local" value={f.event_at} onChange={(e) => setF({ ...f, event_at: e.target.value })} />
        </Field>
        {!caseId && !existing && (
          <Field label="Case (optional)" className="sm:col-span-2">
            <Select value={f.case_id} onChange={(e) => setF({ ...f, case_id: e.target.value })}>
              <option value="">No case</option>
              {cases?.items?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Message (optional)" className="sm:col-span-2"><Textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
      </div>
      <Field as="div" label="Remind" className="mt-4">
        <div className="flex flex-wrap gap-4">
          {OFFSETS.map((o) => (
            <Checkbox key={o} label={o === 0 ? "On the day" : `${o} day${o > 1 ? "s" : ""} before`} checked={f.offsets_days.includes(o)} onChange={() => toggle("offsets_days", o)} />
          ))}
        </div>
      </Field>
      
      <Field label="Also remind at (optional)" className="mt-4" hint="Any exact date & time — e.g. 2 minutes from now to test a call">
        <div className="flex gap-2">
          <Input type="datetime-local" value={f.custom_time} onChange={(e) => setF({ ...f, custom_time: e.target.value })} />
          <Button type="button" variant="secondary" onClick={() => setF({ ...f, custom_time: toLocalInput(new Date(Date.now() + 2 * 60000)) })}>
            +2 min
          </Button>
        </div>
      </Field>
      <Field as="div" label="Channels" className="mt-4" hint="SMS and calls only reach people who have given consent in their profile. Calls go out 09:00–21:00 IST.">
        <div className="flex flex-wrap gap-4">
          {CHANNELS.map(([v, l]) => <Checkbox key={v} label={l} checked={f.channels.includes(v)} onChange={() => toggle("channels", v)} />)}
        </div>
      </Field>
      {!isJunior && (
        <Field as="div" label="Recipients" className="mt-4" hint="Leave empty to remind only yourself.">
          <MemberPicker members={staffAndClients} value={f.recipient_ids} onChange={(v) => setF({ ...f, recipient_ids: v })} />
        </Field>
      )}
      {!existing && f.case_id && !isJunior && (
        <div className="mt-4">
          <Checkbox label="Also remind the clients on this case" checked={f.include_case_clients} onChange={(v) => setF({ ...f, include_case_clients: v })} />
        </div>
      )}
    </Modal>
  );
}

export function TaskModal({ open, onClose, caseId, existing }) {
  const { user } = useAuth();
  const isJunior = user.role === "junior_advocate";
  const { data: staff } = useMembers(undefined, { enabled: open });
  const { data: cases } = useApi(["cases", "picker"], "/cases", { limit: 200, disposed: false }, { enabled: open && !caseId });
  const [f, setF] = useState({ title: "", description: "", case_id: caseId || "", assigned_to_id: "", due_at: "" });

  useEffect(() => {
    if (!open) return;
    setF(
      existing
        ? {
            title: existing.title,
            description: existing.description || "",
            case_id: existing.case_id || "",
            assigned_to_id: existing.assigned_to_id || "",
            due_at: existing.due_at ? toLocalInput(new Date(existing.due_at)) : "",
          }
        : { title: "", description: "", case_id: caseId || "", assigned_to_id: isJunior ? user.id : "", due_at: "" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  const save = useAction(
    () => {
      const body = {
        title: f.title,
        description: f.description || null,
        assigned_to_id: f.assigned_to_id || null,
        due_at: f.due_at ? new Date(f.due_at).toISOString() : null,
      };
      if (existing) return patch(`/tasks/${existing.id}`, body);
      return post("/tasks", { ...body, case_id: f.case_id || null });
    },
    { success: existing ? "Task updated" : "Task created", invalidate: ["tasks", "dashboard"], onSuccess: onClose },
  );
  const assignees = (staff?.items || []).filter((m) => m.role !== "client");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit task" : "New task"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} disabled={!f.title} onClick={() => save.mutate()}>Save task</Button>
        </>
      }
    >
      <ErrorBox error={save.error} className="mb-4" />
      <div className="space-y-4">
        <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Draft rejoinder" /></Field>
        <Field label="Details"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        {!caseId && !existing && (
          <Field label="Case">
            <Select value={f.case_id} onChange={(e) => setF({ ...f, case_id: e.target.value })}>
              <option value="">No case</option>
              {cases?.items?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assign to">
            <Select value={f.assigned_to_id} disabled={isJunior} onChange={(e) => setF({ ...f, assigned_to_id: e.target.value })}>
              <option value="">Unassigned</option>
              {assignees.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </Select>
          </Field>
          <Field label="Due">
            <Input type="datetime-local" value={f.due_at} onChange={(e) => setF({ ...f, due_at: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
