import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, FileText, DollarSign, TrendingUp, Activity, Clock, Zap } from "lucide-react";
import axios from "../api/axios";
import ConfirmationDialog from "../components/ConfirmationDialog";

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_15px_35px_-20px_var(--accent-soft-strong)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmVariant: "danger",
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!user?.isGlobalAdmin) {
      navigate("/dashboard");
      return;
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await axios.get("/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = ({ title, message, confirmText, cancelText, confirmVariant, onConfirm }) => {
    setDialog({
      isOpen: true,
      title,
      message,
      confirmText: confirmText || "Confirm",
      cancelText: cancelText || "Cancel",
      confirmVariant: confirmVariant || "danger",
      onConfirm,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-light)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 pt-20">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Manage users, workspaces, and system settings.</p>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} color="bg-[var(--color-info-soft)] text-[var(--color-info)]" />
          <StatCard label="Workspaces" value={stats?.totalWorkspaces || 0} icon={Briefcase} color="bg-[var(--accent-soft)] text-[var(--accent)]" />
          <StatCard label="Reports" value={stats?.totalReports || 0} icon={FileText} color="bg-[var(--color-success-soft)] text-[var(--color-success)]" />
          <StatCard label="Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="bg-[var(--color-warning-soft)] text-[var(--color-warning)]" />
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-[var(--border-dark)]">
          <div className="flex gap-4 overflow-x-auto">
            {["overview", "users", "workspaces", "reports"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors duration-150 ${
                  activeTab === tab
                    ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && <Overview stats={stats} />}
          {activeTab === "users" && <UserManagement openDialog={openDialog} />}
          {activeTab === "workspaces" && <WorkspaceManagement openDialog={openDialog} />}
          {activeTab === "reports" && <ReportManagement />}
        </div>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={dialog.isOpen}
          onClose={() => setDialog({ ...dialog, isOpen: false })}
          onConfirm={dialog.onConfirm}
          title={dialog.title}
          message={dialog.message}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          confirmVariant={dialog.confirmVariant}
        />
      </div>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────
function Overview({ stats }) {
  const currentTime = new Date().toLocaleString();
  const systemUptime = "2d 4h 32m"; // Placeholder – you can compute from server start time if needed

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">System Overview</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 transition-colors duration-150 hover:border-[var(--border-medium)]">
            <Activity className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">System Status</p>
              <p className="text-sm font-medium text-[var(--color-success)]">● Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 transition-colors duration-150 hover:border-[var(--border-medium)]">
            <Clock className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">Uptime</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{systemUptime}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 transition-colors duration-150 hover:border-[var(--border-medium)]">
            <Zap className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">Last Updated</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{currentTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">User Activity</h3>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Total Users</span>
              <span className="font-medium text-[var(--text-primary)]">{stats?.totalUsers || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Workspaces</span>
              <span className="font-medium text-[var(--text-primary)]">{stats?.totalWorkspaces || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Reports Generated</span>
              <span className="font-medium text-[var(--text-primary)]">{stats?.totalReports || 0}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Financial Summary</h3>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Total Revenue</span>
              <span className="font-medium text-[var(--text-primary)]">₹{(stats?.totalRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Average Revenue / User</span>
              <span className="font-medium text-[var(--text-primary)]">
                ₹{stats?.totalUsers ? Math.round((stats.totalRevenue || 0) / stats.totalUsers).toLocaleString() : 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Paid Users</span>
              <span className="font-medium text-[var(--text-primary)]">0</span> {/* You can add a field if you track paid users */}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Quick Actions</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <button className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--bg-hover)] active:scale-[0.97]">
            View All Users
          </button>
          <button className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--bg-hover)] active:scale-[0.97]">
            Export Reports
          </button>
          <button className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--bg-hover)] active:scale-[0.97]">
            System Logs
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UserManagement ─────────────────────────────────────────────
function UserManagement({ openDialog }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`/admin/users?search=${search}`);
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const toggleAdmin = (userId) => {
    openDialog({
      title: "Toggle Admin Status",
      message: "Are you sure you want to change this user's admin status?",
      confirmText: "Toggle",
      confirmVariant: "primary",
      onConfirm: async () => {
        try {
          await axios.put(`/admin/users/${userId}/toggle-admin`);
          fetchUsers();
        } catch (err) {
          alert(err.response?.data?.error || "Failed to toggle admin");
        }
      },
    });
  };

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading users...</div>;

  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4">
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-hover)]">
            <tr>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Name</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Email</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Admin</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-dark)]">
            {users.map((u) => (
              <tr key={u._id} className="transition-colors duration-150 hover:bg-[var(--bg-hover)]/40">
                <td className="px-4 py-2 text-[var(--text-primary)]">{u.name}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">{u.email}</td>
                <td className="px-4 py-2">
                  <span className={u.isGlobalAdmin ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}>
                    {u.isGlobalAdmin ? "✅" : "❌"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleAdmin(u._id)}
                    className="rounded-lg border border-[var(--border-light)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--bg-hover)] active:scale-[0.96]"
                  >
                    Toggle Admin
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── WorkspaceManagement ────────────────────────────────────────
function WorkspaceManagement({ openDialog }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      const res = await axios.get("/admin/workspaces");
      setWorkspaces(res.data.workspaces);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkspaces(); }, []);

  const deleteWorkspace = (id) => {
    openDialog({
      title: "Delete Workspace",
      message: "Delete this workspace and all its data? This action cannot be undone.",
      confirmText: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await axios.delete(`/admin/workspaces/${id}`);
          fetchWorkspaces();
        } catch (err) {
          alert(err.response?.data?.error || "Failed to delete workspace");
        }
      },
    });
  };

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading workspaces...</div>;

  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-hover)]">
            <tr>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Workspace</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Owner</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Members</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-dark)]">
            {workspaces.map((ws) => (
              <tr key={ws._id} className="transition-colors duration-150 hover:bg-[var(--bg-hover)]/40">
                <td className="px-4 py-2 text-[var(--text-primary)]">{ws.name}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">{ws.ownerId?.email || "N/A"}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">{ws.members?.length || 0}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => deleteWorkspace(ws._id)}
                    className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-1 text-xs text-[var(--color-danger)] transition-all duration-150 hover:bg-[var(--color-danger)]/20 active:scale-[0.96]"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ReportManagement ───────────────────────────────────────────
function ReportManagement() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await axios.get("/admin/reports");
      setReports(res.data.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Loading reports...</div>;

  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-hover)]">
            <tr>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Repo</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">User</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Workspace</th>
              <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-dark)]">
            {reports.map((r) => (
              <tr key={r._id} className="transition-colors duration-150 hover:bg-[var(--bg-hover)]/40">
                <td className="px-4 py-2 text-[var(--text-primary)]">{r.repoUrl}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">{r.userId?.email || "Unknown"}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">{r.workspaceId?.name || "N/A"}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}