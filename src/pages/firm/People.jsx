import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Search, UserPlus } from "lucide-react";
import { patch, post } from "../../api/client";
import { useAction, useApi, useLanguages } from "../../lib/hooks";
import { ROLE_LABEL, useAuth } from "../../lib/auth";
import { Badge, Button, Card, Checkbox, ErrorBox, Field, Input, Loading, Modal, PageHeader, Pagination, Select, StatusBadge, Table, Tabs } from "../../components/ui";
import { fmtDate } from "../../lib/format";

function PersonModal({ open, onClose, existing, defaultRole }) {
  const { user } = useAuth();
  const { data: langs } = useLanguages();
  const isAdmin = user.role === "firm_admin";
  const blank = { full_name: "", email: "", phone: "", role: defaultRole, language: "en", bar_council_id: "", is_active: true };
  const [f, setF] = useState(blank);
  const [loadedFor, setLoadedFor] = useState(null);
  const key = open ? existing?.id || `new-${defaultRole}` : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (open) setF(existing ? { ...blank, ...existing, email: existing.email || "", phone: existing.phone || "", bar_council_id: existing.bar_council_id || "" } : blank);
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isClient = f.role === "client";

  const save = useAction(
    () => {
      if (existing) {
        const body = { full_name: f.full_name, phone: f.phone || null, language: f.language, is_active: f.is_active, bar_council_id: f.bar_council_id || null };
        if (isAdmin && f.role !== existing.role) body.role = f.role;
        return patch(`/firm/users/${existing.id}`, body);
      }
      const body = { full_name: f.full_name, role: f.role, language: f.language };
      if (f.email) body.email = f.email;
      if (f.phone) body.phone = f.phone;
      if (f.bar_council_id) body.bar_council_id = f.bar_council_id;
      return post("/firm/users", body);
    },
    { success: existing ? "Saved" : (u) => `${u.full_name} added`, invalidate: ["members", "people"], onSuccess: onClose },
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? `Edit ${existing.full_name}` : isClient ? "Add client" : "Add team member"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}
    >
      <ErrorBox error={save.error} className="mb-4" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" className="sm:col-span-2"><Input value={f.full_name} onChange={set("full_name")} /></Field>
        <Field label="Role">
          <Select value={f.role} disabled={!isAdmin || (existing && existing.id === user.id)} onChange={set("role")}>
            {(isAdmin ? ["firm_admin", "lawyer", "junior_advocate", "client"] : ["client"]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </Field>
        <Field label="Language">
          <Select value={f.language} onChange={set("language")}>
            {langs?.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Mobile number *" hint="They sign in with this number using an OTP"><Input required value={f.phone} onChange={set("phone")} placeholder="98123 45678" /></Field>
        <Field label="Email (optional)"><Input type="email" value={f.email} disabled={!!existing} onChange={set("email")} /></Field>
        {!isClient && <Field label="Bar Council ID"><Input value={f.bar_council_id} onChange={set("bar_council_id")} /></Field>}
        {existing && existing.id !== user.id && (
          <div className="sm:col-span-2"><Checkbox label="Account active" checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} /></div>
        )}
      </div>
    </Modal>
  );
}

export default function People() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(user.role === "firm_admin" ? "team" : "clients");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState(null);
  const role = tab === "clients" ? "client" : undefined;
  const { data, isLoading } = useApi(["people", tab, q, offset], "/firm/users", { role, q, limit: 25, offset });
  const rows = tab === "team" ? (data?.items || []).filter((u) => u.role !== "client") : data?.items;

  return (
    <>
      <PageHeader
        title={user.role === "firm_admin" ? "Team & clients" : "Clients & team"}
        subtitle="People in your firm and the clients you share cases with."
        actions={
          <>
            {user.role === "firm_admin" && <Button variant="secondary" icon={UserPlus} onClick={() => setModal({ role: "lawyer" })}>Add team member</Button>}
            <Button icon={UserPlus} onClick={() => setModal({ role: "client" })}>Add client</Button>
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={(t) => { setTab(t); setOffset(0); }}
        tabs={[
          { value: "team", label: "Team" },
          { value: "clients", label: "Clients" },
        ]}
      />
      <Card padded={false}>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search name, email or phone" value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} />
          </div>
        </div>
        {isLoading ? (
          <Loading />
        ) : (
          <Table
            rows={rows}
            empty={tab === "clients" ? "No clients yet" : "No team members"}
            columns={[
              { key: "full_name", label: "Name", render: (u) => <div><p className="font-medium text-slate-900">{u.full_name}</p>{u.bar_council_id && <p className="text-xs text-slate-400">{u.bar_council_id}</p>}</div> },
              { key: "role", label: "Role", render: (u) => <Badge tone="brand">{ROLE_LABEL[u.role]}</Badge> },
              { key: "contact", label: "Contact", render: (u) => <div className="text-xs"><p>{u.email || "—"}</p><p className="text-slate-400">{u.phone || ""}</p></div> },
              { key: "language", label: "Lang", render: (u) => <span className="uppercase text-xs">{u.language}</span> },
              { key: "consent", label: "SMS / Call consent", render: (u) => <div className="flex gap-1"><Badge tone={u.sms_consent_at ? "green" : "slate"}>SMS</Badge><Badge tone={u.call_consent_at ? "green" : "slate"}>Call</Badge></div> },
              { key: "active", label: "Status", render: (u) => <StatusBadge value={u.is_active ? "active" : "suspended"} /> },
              { key: "created_at", label: "Added", render: (u) => <span className="text-xs">{fmtDate(u.created_at)}</span> },
              {
                key: "a",
                label: "",
                render: (u) => (
                  <div className="flex justify-end gap-1">
                    {u.role === "client" && <Button size="sm" variant="ghost" onClick={() => navigate(`/cases?client=${u.id}`)}>Cases</Button>}
                    {(user.role === "firm_admin" || u.role === "client") && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setModal({ existing: u, role: u.role })} />}
                  </div>
                ),
              },
            ]}
          />
        )}
        {data && <Pagination total={data.total} limit={data.limit} offset={offset} onChange={setOffset} />}
      </Card>
      <PersonModal open={!!modal} existing={modal?.existing} defaultRole={modal?.role || "client"} onClose={() => setModal(null)} />
    </>
  );
}
