import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Loading } from "./components/ui";
import { useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import NotificationsPage from "./pages/Notifications";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Firms from "./pages/admin/Firms";
import FirmDetail from "./pages/admin/FirmDetail";
import AdminUsage from "./pages/admin/AdminUsage";
import AdminAudit from "./pages/admin/AdminAudit";
import Dashboard from "./pages/firm/Dashboard";
import Cases from "./pages/firm/Cases";
import AddCase from "./pages/firm/AddCase";
import CaseDetail from "./pages/firm/CaseDetail";
import Calendar from "./pages/firm/Calendar";
import Reminders from "./pages/firm/Reminders";
import Tasks from "./pages/firm/Tasks";
import People from "./pages/firm/People";
import Reports from "./pages/firm/Reports";
import FirmSettings from "./pages/firm/FirmSettings";

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Starting Court Life…" />;
  if (!user)
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );

  const isSuper = user.role === "super_admin";
  const staff = ["firm_admin", "lawyer", "junior_advocate"];
  const managers = ["firm_admin", "lawyer"];

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={isSuper ? <AdminDashboard /> : <Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<NotificationsPage />} />

        <Route path="admin/firms" element={<RequireRole roles={["super_admin"]}><Firms /></RequireRole>} />
        <Route path="admin/firms/:id" element={<RequireRole roles={["super_admin"]}><FirmDetail /></RequireRole>} />
        <Route path="admin/usage" element={<RequireRole roles={["super_admin"]}><AdminUsage /></RequireRole>} />
        <Route path="admin/audit" element={<RequireRole roles={["super_admin"]}><AdminAudit /></RequireRole>} />

        <Route path="cases" element={<RequireRole roles={[...staff, "client"]}><Cases /></RequireRole>} />
        <Route path="cases/new" element={<RequireRole roles={managers}><AddCase /></RequireRole>} />
        <Route path="cases/:id" element={<RequireRole roles={[...staff, "client"]}><CaseDetail /></RequireRole>} />
        <Route path="calendar" element={<RequireRole roles={[...staff, "client"]}><Calendar /></RequireRole>} />
        <Route path="reminders" element={<RequireRole roles={staff}><Reminders /></RequireRole>} />
        <Route path="tasks" element={<RequireRole roles={staff}><Tasks /></RequireRole>} />
        <Route path="people" element={<RequireRole roles={managers}><People /></RequireRole>} />
        <Route path="reports" element={<RequireRole roles={["firm_admin"]}><Reports /></RequireRole>} />
        <Route path="firm" element={<RequireRole roles={["firm_admin"]}><FirmSettings /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
