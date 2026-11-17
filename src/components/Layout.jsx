import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  Scale,
  Settings,
  ShieldCheck,
  User,
  Users,
  AlarmClock,
  X,
} from "lucide-react";
import { ROLE_LABEL, useAuth } from "../lib/auth";
import { useAction, useApi } from "../lib/hooks";
import { post } from "../api/client";
import { timeAgo } from "../lib/format";

const NAV = {
  super_admin: [
    { to: "/", label: "Platform Overview", icon: Gauge, end: true },
    { to: "/admin/firms", label: "Law Firms", icon: Building2 },
    { to: "/admin/usage", label: "Usage & Billing", icon: BarChart3 },
    { to: "/admin/audit", label: "Audit Logs", icon: ShieldCheck },
  ],
  firm_admin: [
    { to: "/", label: "Dashboard", icon: Gauge, end: true },
    { to: "/cases", label: "Cases", icon: Briefcase },
    { to: "/calendar", label: "Hearing Calendar", icon: CalendarDays },
    { to: "/reminders", label: "Reminders", icon: AlarmClock },
    { to: "/tasks", label: "Tasks", icon: CheckSquare },
    { to: "/people", label: "Team & Clients", icon: Users },
    { to: "/reports", label: "Reports & Usage", icon: BarChart3 },
    { to: "/firm", label: "Firm Settings", icon: Settings },
  ],
  lawyer: [
    { to: "/", label: "Dashboard", icon: Gauge, end: true },
    { to: "/cases", label: "Cases", icon: Briefcase },
    { to: "/calendar", label: "Hearing Calendar", icon: CalendarDays },
    { to: "/reminders", label: "Reminders", icon: AlarmClock },
    { to: "/tasks", label: "Tasks", icon: CheckSquare },
    { to: "/people", label: "Clients & Team", icon: Users },
  ],
  junior_advocate: [
    { to: "/", label: "Dashboard", icon: Gauge, end: true },
    { to: "/cases", label: "My Cases", icon: Briefcase },
    { to: "/calendar", label: "Hearing Calendar", icon: CalendarDays },
    { to: "/reminders", label: "Reminders", icon: AlarmClock },
    { to: "/tasks", label: "My Tasks", icon: CheckSquare },
  ],
  client: [
    { to: "/", label: "Home", icon: Gauge, end: true },
    { to: "/cases", label: "My Cases", icon: Briefcase },
    { to: "/calendar", label: "Hearings", icon: CalendarDays },
  ],
};

function Sidebar({ user, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-brand-900 text-indigo-100">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5" onClick={onNavigate}>
        <span className="rounded-lg bg-brand-600 p-1.5 text-white">
          <Scale className="size-5" />
        </span>
        <div>
          <p className="text-base font-bold leading-tight text-white">Court Life</p>
          <p className="text-[11px] text-indigo-300">Court Management System</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {(NAV[user.role] || []).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? "bg-white/10 text-white" : "text-indigo-200 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="size-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-xl bg-white/5 p-3 text-xs text-indigo-200">
        <p className="font-semibold text-white">{ROLE_LABEL[user.role]}</p>
        <p className="mt-0.5">Official court records remain authoritative. Synced data shows its source and last-sync time.</p>
      </div>
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { data: count } = useApi("unread", "/notifications/unread-count", undefined, { refetchInterval: 30_000 });
  const { data } = useApi(["notifications", "recent"], "/notifications", { limit: 8 }, { enabled: open });
  const readAll = useAction(() => post("/notifications/read-all"), { invalidate: ["unread", "notifications"] });
  const readOne = useAction((id) => post(`/notifications/${id}/read`), { invalidate: ["unread", "notifications"] });

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
        <Bell className="size-5" />
        {count?.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {count.unread > 9 ? "9+" : count.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-slide-in absolute right-0 z-40 mt-2 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button className="text-xs font-medium text-brand-600 hover:underline" onClick={() => readAll.mutate()}>
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {!data?.items?.length && <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>}
            {data?.items?.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read_at) readOne.mutate(n.id);
                  if (n.case_id) navigate(`/cases/${n.case_id}`);
                  setOpen(false);
                }}
                className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.read_at ? "" : "bg-brand-50/50"}`}
              >
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
                <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
              </button>
            ))}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-brand-600 hover:bg-slate-50">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const initials = user.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{initials}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight">{user.full_name}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open && (
        <div className="animate-slide-in absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50">
            <User className="size-4" /> Profile & preferences
          </Link>
          <Link to="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50">
            <ClipboardList className="size-4" /> Notifications
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 lg:block">
        <Sidebar user={user} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="w-64">
            <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="hidden text-sm text-slate-500 lg:block">
            {user.tenant_id ? "Law firm workspace" : "Platform administration"}
          </div>
          <div className="flex items-center gap-2">
            <Notifications />
            <UserMenu user={user} logout={logout} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 scrollbar-thin">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
