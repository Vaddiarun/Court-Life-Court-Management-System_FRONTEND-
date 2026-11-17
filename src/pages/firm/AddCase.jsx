import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileSearch, Gavel, PenLine, Plus, Search } from "lucide-react";
import { post } from "../../api/client";
import { useAction, useMembers } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { Badge, Button, Card, Checkbox, ErrorBox, Field, Input, PageHeader, Select, Tabs, Textarea } from "../../components/ui";
import { MemberPicker } from "../../components/shared";
import { fmtDate } from "../../lib/format";

function LeadPicker({ value, onChange }) {
  const { data } = useMembers();
  const leads = (data?.items || []).filter((m) => ["lawyer", "firm_admin"].includes(m.role));
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Me / unassigned</option>
      {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
    </Select>
  );
}

function CnrFlow() {
  const navigate = useNavigate();
  const [cnr, setCnr] = useState("");
  const [record, setRecord] = useState(null);
  const [lead, setLead] = useState("");
  const [clients, setClients] = useState([]);
  const [sync, setSync] = useState(true);
  const { data: clientList } = useMembers("client");

  const lookup = useAction((v) => post("/cases/lookup", { cnr: v }), { onSuccess: setRecord });
  const add = useAction(
    () => post("/cases/from-cnr", { cnr: record.cnr, lead_lawyer_id: lead || null, client_ids: clients, sync_enabled: sync }),
    { success: "Case added to your workspace", invalidate: ["cases", "dashboard"], onSuccess: (c) => navigate(`/cases/${c.id}`) },
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card title="1. Look up by CNR" className="lg:col-span-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setRecord(null);
            lookup.mutate(cnr);
          }}
        >
          <Field label="CNR number" hint="16 characters: 4 letters + 12 digits. Dashes and spaces are ignored.">
            <Input className="font-mono uppercase" placeholder="DLHC010001232024" value={cnr} onChange={(e) => setCnr(e.target.value)} required />
          </Field>
          <Button type="submit" icon={Search} loading={lookup.isPending} className="w-full">Fetch from court data provider</Button>
          <ErrorBox error={lookup.error} />
          <p className="text-xs text-slate-400">Each lookup is metered as one case-detail request. Adding the case right after a lookup reuses the result at no extra cost.</p>
        </form>
      </Card>

      <Card title="2. Review & add" className="lg:col-span-3">
        {!record ? (
          <div className="flex flex-col items-center py-10 text-center text-sm text-slate-500">
            <FileSearch className="mb-3 size-10 text-slate-300" />
            The case record will appear here for review before you add it.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 p-4">
              <p className="text-lg font-bold text-slate-900">{record.title}</p>
              <p className="mt-1 text-sm text-slate-600">{record.court_name} {record.state && `· ${record.state}`}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="brand">{record.case_number || "No case no."}</Badge>
                <Badge tone={record.is_disposed ? "slate" : "green"}>{record.status || "Unknown status"}</Badge>
                {record.stage && <Badge tone="amber">{record.stage}</Badge>}
                <Badge tone="violet">via {record.provider}</Badge>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">Petitioner(s)</dt><dd>{record.petitioners.join(", ") || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Respondent(s)</dt><dd>{record.respondents.join(", ") || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Judge</dt><dd>{record.judge || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Filing date</dt><dd>{fmtDate(record.filing_date)}</dd></div>
              <div><dt className="text-xs text-slate-500">Next hearing</dt><dd className="font-semibold">{fmtDate(record.next_hearing_date)}</dd></div>
              <div><dt className="text-xs text-slate-500">Hearings / orders</dt><dd>{record.hearings.length} / {record.orders.length}</dd></div>
            </dl>

            {record.already_in_workspace ? (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This case is already in your workspace.
                <Link to={`/cases/${record.already_in_workspace}`} className="font-semibold underline">Open it</Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Lead lawyer"><LeadPicker value={lead} onChange={setLead} /></Field>
                  <Field as="div" label="Synchronisation">
                    <div className="pt-2"><Checkbox label="Keep this case in sync automatically" checked={sync} onChange={setSync} /></div>
                  </Field>
                </div>
                <Field as="div" label="Share with clients">
                  <MemberPicker members={clientList?.items} value={clients} onChange={setClients} emptyText="No clients yet — add them under Clients & Team." />
                </Field>
                <Button icon={CheckCircle2} loading={add.isPending} onClick={() => add.mutate()} className="w-full">Add case to workspace</Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function ManualFlow() {
  const navigate = useNavigate();
  const { data: clientList } = useMembers("client");
  const empty = {
    title: "", cnr: "", case_number: "", case_type: "", case_year: "", court_name: "", court_level: "", state: "", district: "",
    judge: "", petitioners: "", respondents: "", filing_date: "", status: "Pending", stage: "", next_hearing_date: "", description: "",
  };
  const [f, setF] = useState(empty);
  const [lead, setLead] = useState("");
  const [clients, setClients] = useState([]);
  const [dupes, setDupes] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const create = useAction(
    (force) => {
      const body = { lead_lawyer_id: lead || null, client_ids: clients, force: !!force, sync_enabled: !!f.cnr };
      Object.entries(f).forEach(([k, v]) => {
        if (v === "") return;
        if (k === "petitioners" || k === "respondents") body[k] = v.split(",").map((s) => s.trim()).filter(Boolean);
        else if (k === "case_year") body[k] = Number(v);
        else body[k] = v;
      });
      return post("/cases", body);
    },
    { success: "Case created", invalidate: ["cases", "dashboard"], onSuccess: (c) => navigate(`/cases/${c.id}`), quiet: (e) => e.status === 409 && !!e.detail?.case_ids },
  );

  const submit = (force) =>
    create.mutate(force, {
      onError: (err) => setDupes(err.status === 409 && err.detail?.case_ids ? err.detail.case_ids : null),
    });

  return (
    <Card title="Manual case entry">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setDupes(null);
          submit(false);
        }}
        className="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Case title *" className="md:col-span-2"><Input required value={f.title} onChange={set("title")} placeholder="Petitioner vs Respondent" /></Field>
          <Field label="CNR (optional)" hint="Enables automatic sync"><Input className="font-mono uppercase" value={f.cnr} onChange={set("cnr")} /></Field>
          <Field label="Case number"><Input value={f.case_number} onChange={set("case_number")} placeholder="O.S. 77/2025" /></Field>
          <Field label="Case type"><Input value={f.case_type} onChange={set("case_type")} /></Field>
          <Field label="Year"><Input type="number" value={f.case_year} onChange={set("case_year")} /></Field>
          <Field label="Court" className="md:col-span-2"><Input value={f.court_name} onChange={set("court_name")} placeholder="City Civil Court, Hyderabad" /></Field>
          <Field label="Court level">
            <Select value={f.court_level} onChange={set("court_level")}>
              <option value="">—</option>
              <option value="district">District / Subordinate</option>
              <option value="high_court">High Court</option>
              <option value="supreme_court">Supreme Court</option>
              <option value="tribunal">Tribunal</option>
            </Select>
          </Field>
          <Field label="State"><Input value={f.state} onChange={set("state")} /></Field>
          <Field label="District"><Input value={f.district} onChange={set("district")} /></Field>
          <Field label="Judge"><Input value={f.judge} onChange={set("judge")} /></Field>
          <Field label="Petitioners" hint="Comma separated"><Input value={f.petitioners} onChange={set("petitioners")} /></Field>
          <Field label="Respondents" hint="Comma separated"><Input value={f.respondents} onChange={set("respondents")} /></Field>
          <Field label="Filing date"><Input type="date" value={f.filing_date} onChange={set("filing_date")} /></Field>
          <Field label="Status"><Input value={f.status} onChange={set("status")} /></Field>
          <Field label="Stage"><Input value={f.stage} onChange={set("stage")} /></Field>
          <Field label="Next hearing"><Input type="date" value={f.next_hearing_date} onChange={set("next_hearing_date")} /></Field>
          <Field label="Lead lawyer"><LeadPicker value={lead} onChange={setLead} /></Field>
          <Field label="Notes / description" className="md:col-span-3"><Textarea value={f.description} onChange={set("description")} /></Field>
        </div>
        <Field as="div" label="Share with clients">
          <MemberPicker members={clientList?.items} value={clients} onChange={setClients} emptyText="No clients yet." />
        </Field>
        {create.error && !dupes && <ErrorBox error={create.error} />}
        {dupes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Possible duplicate</p>
            <p className="mt-1">A case with the same number and court already exists:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dupes.map((id) => <Link key={id} to={`/cases/${id}`} className="font-medium underline">Open existing case</Link>)}
            </div>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => submit(true)}>Create anyway</Button>
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" icon={Plus} loading={create.isPending}>Create case</Button>
        </div>
      </form>
    </Card>
  );
}

export default function AddCase() {
  const [tab, setTab] = useState("cnr");
  useAuth();
  return (
    <>
      <Link to="/cases" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Cases
      </Link>
      <PageHeader title="Add a case" subtitle="Fetch it from the court data provider by CNR, or enter it manually." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "cnr", label: "CNR lookup", icon: Gavel },
          { value: "manual", label: "Manual entry", icon: PenLine },
        ]}
      />
      {tab === "cnr" ? <CnrFlow /> : <ManualFlow />}
    </>
  );
}
