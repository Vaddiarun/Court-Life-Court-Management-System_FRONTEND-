import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Briefcase, Plus, Search } from "lucide-react";
import { useApi, useMembers } from "../../lib/hooks";
import { isManager, useAuth } from "../../lib/auth";
import { Badge, Button, Card, EmptyState, Input, Loading, PageHeader, Pagination, Select, StatusBadge, Table } from "../../components/ui";
import { HearingCountdown } from "../../components/shared";
import { timeAgo } from "../../lib/format";

export default function Cases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [q, setQ] = useState("");
  const [disposed, setDisposed] = useState("false");
  const [lawyer, setLawyer] = useState("");
  const [sort, setSort] = useState(sp.get("sort") || "next_hearing");
  const [offset, setOffset] = useState(0);
  const isClient = user.role === "client";
  const { data: lawyers } = useMembers("lawyer", { enabled: isManager(user) });
  const clientId = sp.get("client") || undefined;
  const params = { q, disposed: disposed === "" ? undefined : disposed, lawyer_id: lawyer || undefined, client_id: clientId, sort, limit: 25, offset };
  const { data, isLoading } = useApi(["cases", params], "/cases", params);

  const reset = (fn) => (e) => {
    fn(e.target.value);
    setOffset(0);
  };

  return (
    <>
      <PageHeader
        title={isClient ? "My cases" : "Cases"}
        subtitle={isClient ? "Cases your lawyer has shared with you." : "Every case in your workspace with its next hearing and sync status."}
        actions={isManager(user) && <Link to="/cases/new"><Button icon={Plus}>Add case</Button></Link>}
      />
      <Card padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search title, CNR or case number" value={q} onChange={reset(setQ)} />
          </div>
          <Select className="w-40" value={disposed} onChange={reset(setDisposed)}>
            <option value="false">Active</option>
            <option value="true">Disposed</option>
            <option value="">All cases</option>
          </Select>
          {isManager(user) && (
            <Select className="w-48" value={lawyer} onChange={reset(setLawyer)}>
              <option value="">All lawyers</option>
              {lawyers?.items?.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
            </Select>
          )}
          <Select className="w-48" value={sort} onChange={reset(setSort)}>
            <option value="next_hearing">Next hearing first</option>
            <option value="created">Recently added</option>
            <option value="title">Title A–Z</option>
            <option value="last_synced">Recently synced</option>
          </Select>
        </div>
        {isLoading ? (
          <Loading />
        ) : !data.items.length ? (
          <EmptyState
            icon={Briefcase}
            title={q ? "No cases match your search" : "No cases yet"}
            action={isManager(user) && !q && <Link to="/cases/new"><Button icon={Plus}>Add your first case</Button></Link>}
          >
            {isManager(user) && !q && "Look up a case by its 16-character CNR number or enter it manually."}
          </EmptyState>
        ) : (
          <Table
            rows={data.items}
            onRowClick={(c) => navigate(`/cases/${c.id}`)}
            columns={[
              {
                key: "title",
                label: "Case",
                render: (c) => (
                  <div className="min-w-56">
                    <p className="font-semibold text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      {c.case_number || "—"} {c.cnr && <span className="font-mono">· {c.cnr}</span>}
                    </p>
                  </div>
                ),
              },
              { key: "court_name", label: "Court", render: (c) => <span className="text-sm">{c.court_name || "—"}</span> },
              {
                key: "status",
                label: "Status",
                render: (c) => (
                  <div className="space-y-1">
                    <Badge tone={c.is_disposed ? "slate" : "green"}>{c.status || "—"}</Badge>
                    {c.stage && <p className="text-xs text-slate-400">{c.stage}</p>}
                  </div>
                ),
              },
              { key: "next_hearing_date", label: "Next hearing", render: (c) => <HearingCountdown date={c.next_hearing_date} /> },
              {
                key: "sync",
                label: "Sync",
                render: (c) =>
                  c.last_sync_error ? (
                    <Badge tone="rose"><AlertTriangle className="size-3" /> error</Badge>
                  ) : (
                    <div className="space-y-1">
                      <StatusBadge value={c.source} />
                      <p className="text-xs text-slate-400">{timeAgo(c.last_synced_at)}</p>
                    </div>
                  ),
              },
            ]}
          />
        )}
        {data && <Pagination total={data.total} limit={data.limit} offset={offset} onChange={setOffset} />}
      </Card>
    </>
  );
}
