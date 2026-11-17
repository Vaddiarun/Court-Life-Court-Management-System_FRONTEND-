import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { post } from "../api/client";
import { useAction, useApi } from "../lib/hooks";
import { Badge, Button, Card, EmptyState, Loading, PageHeader, Pagination } from "../components/ui";
import { fmtDateTime, titleCase } from "../lib/format";

export default function NotificationsPage() {
  const [unread, setUnread] = useState(false);
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();
  const { data, isLoading } = useApi(["notifications", unread, offset], "/notifications", { unread, limit: 20, offset });
  const readAll = useAction(() => post("/notifications/read-all"), { success: "All marked as read", invalidate: ["notifications", "unread"] });
  const readOne = useAction((id) => post(`/notifications/${id}/read`), { invalidate: ["notifications", "unread"] });

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Case updates, reminders and shared documents."
        actions={
          <>
            <Button variant="secondary" onClick={() => { setUnread(!unread); setOffset(0); }}>
              {unread ? "Show all" : "Unread only"}
            </Button>
            <Button icon={CheckCheck} onClick={() => readAll.mutate()}>
              Mark all read
            </Button>
          </>
        }
      />
      <Card padded={false}>
        {isLoading ? (
          <Loading />
        ) : !data?.items?.length ? (
          <EmptyState icon={Bell} title="No notifications" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((n) => (
              <li
                key={n.id}
                className={`flex cursor-pointer items-start gap-4 px-5 py-4 hover:bg-slate-50 ${n.read_at ? "" : "bg-brand-50/40"}`}
                onClick={() => {
                  if (!n.read_at) readOne.mutate(n.id);
                  if (n.case_id) navigate(`/cases/${n.case_id}`);
                }}
              >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-slate-200" : "bg-brand-600"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-800">{n.title}</p>
                    <Badge>{titleCase(n.kind)}</Badge>
                  </div>
                  {n.body && <p className="mt-1 text-sm text-slate-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{fmtDateTime(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination total={data.total} limit={data.limit} offset={offset} onChange={setOffset} />}
      </Card>
    </>
  );
}
