import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { del, patch } from "../../api/client";
import { useAction, useApi, useMembers } from "../../lib/hooks";
import { isManager, useAuth } from "../../lib/auth";
import { Badge, Button, EmptyState, Loading, PageHeader, Select } from "../../components/ui";
import { TaskModal } from "../../components/forms";
import { fmtDateTime } from "../../lib/format";

const COLUMNS = [
  { key: "open", label: "To do", tone: "sky" },
  { key: "in_progress", label: "In progress", tone: "amber" },
  { key: "done", label: "Done", tone: "green" },
];

export default function Tasks() {
  const { user } = useAuth();
  const [assignee, setAssignee] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data: members } = useMembers(undefined, { enabled: isManager(user) });
  const params = { limit: 200, assigned_to_id: assignee || undefined };
  const { data, isLoading } = useApi(["tasks", params], "/tasks", params);
  const move = useAction(({ id, status }) => patch(`/tasks/${id}`, { status }), { invalidate: ["tasks", "dashboard"] });
  const remove = useAction((id) => del(`/tasks/${id}`), { success: "Task deleted", invalidate: ["tasks"] });
  const names = Object.fromEntries((members?.items || []).map((m) => [m.id, m.full_name]));
  const now = Date.now();

  return (
    <>
      <PageHeader
        title={user.role === "junior_advocate" ? "My tasks" : "Tasks"}
        subtitle="Work items across cases — drafting, filings, follow-ups."
        actions={
          <>
            {isManager(user) && (
              <Select className="w-48" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Everyone</option>
                {(members?.items || []).filter((m) => m.role !== "client").map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
            )}
            <Button icon={Plus} onClick={() => setCreating(true)}>New task</Button>
          </>
        }
      />
      {isLoading ? (
        <Loading />
      ) : !data.items.length ? (
        <div className="rounded-xl border border-slate-200 bg-white"><EmptyState icon={CheckSquare} title="No tasks" action={<Button icon={Plus} onClick={() => setCreating(true)}>Create a task</Button>} /></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = data.items.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-xl bg-slate-100/70 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                  <Badge tone={col.tone}>{items.length}</Badge>
                </div>
                <div className="space-y-2.5">
                  {items.map((t) => {
                    const overdue = t.status !== "done" && t.due_at && new Date(t.due_at).getTime() < now;
                    return (
                      <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${t.status === "done" ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.title}</p>
                          <div className="flex shrink-0 gap-0.5">
                            <button className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600" onClick={() => setEditing(t)}><Pencil className="size-3.5" /></button>
                            {(isManager(user) || t.created_by_id === user.id) && (
                              <button className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500" onClick={() => remove.mutate(t.id)}><Trash2 className="size-3.5" /></button>
                            )}
                          </div>
                        </div>
                        {t.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          {t.due_at && <Badge tone={overdue ? "rose" : "slate"}>{overdue ? "Overdue · " : "Due "}{fmtDateTime(t.due_at)}</Badge>}
                          {t.assigned_to_id && names[t.assigned_to_id] && <Badge tone="brand">{names[t.assigned_to_id]}</Badge>}
                          {t.case_id && <Link to={`/cases/${t.case_id}`} className="text-brand-600 hover:underline">case</Link>}
                        </div>
                        <div className="mt-3 flex gap-1">
                          {COLUMNS.filter((c) => c.key !== t.status).map((c) => (
                            <button key={c.key} onClick={() => move.mutate({ id: t.id, status: c.key })} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:border-brand-300 hover:text-brand-700">
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {!items.length && <p className="px-1 py-4 text-center text-xs text-slate-400">Nothing here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <TaskModal open={creating} onClose={() => setCreating(false)} />
      <TaskModal open={!!editing} existing={editing} onClose={() => setEditing(null)} />
    </>
  );
}
