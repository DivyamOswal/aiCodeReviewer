// frontend/src/components/Auth/Register.jsx
import { useState } from "react";
import { registerUser } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function UserIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.6-3.6 4.6-5.5 7.5-5.5s5.9 1.9 7.5 5.5" />
    </svg>
  );
}

function MailIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m3 6.5 9 6 9-6" />
    </svg>
  );
}

function LockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </svg>
  );
}

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      return setError("Please fill in all fields.");
    }
    setLoading(true);
    setError("");
    try {
      await registerUser(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  const inputBase =
    "w-full rounded-xl border bg-[var(--bg-input)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-200 hover:border-[var(--border-medium)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40";
  const inputBorder = error ? "border-[var(--color-danger)]/50 focus:border-[var(--color-danger)]" : "border-[var(--border-light)] focus:border-[var(--accent)]";

  return (
    <AuthLayout
      title="Create your account"
      terminalText="start auditing repos"
      error={error}
      onOAuth={handleOAuth}
      footer={{
        question: "Already have an account?",
        linkText: "Sign in",
        linkTo: "/login",
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="animate-fadeUp space-y-1.5" style={{ animationDelay: "120ms" }}>
          <label
            htmlFor="name"
            className="block font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]"
          >
            Full name
          </label>
          <div className="group relative">
            <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors duration-200 group-focus-within:text-[var(--accent)]" />
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
              autoComplete="name"
              className={`${inputBase} ${inputBorder}`}
            />
          </div>
        </div>

        <div className="animate-fadeUp space-y-1.5" style={{ animationDelay: "190ms" }}>
          <label
            htmlFor="email"
            className="block font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]"
          >
            Email
          </label>
          <div className="group relative">
            <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors duration-200 group-focus-within:text-[var(--accent)]" />
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              autoComplete="email"
              className={`${inputBase} ${inputBorder}`}
            />
          </div>
        </div>

        <div className="animate-fadeUp space-y-1.5" style={{ animationDelay: "260ms" }}>
          <label
            htmlFor="password"
            className="block font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]"
          >
            Password
          </label>
          <div className="group relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors duration-200 group-focus-within:text-[var(--accent)]" />
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
              className={`${inputBase} ${inputBorder}`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="animate-fadeUp group relative w-full overflow-hidden rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-all duration-300 hover:bg-[var(--accent-hover)] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
          style={{ animationDelay: "330ms" }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "var(--accent-contrast)", borderTopColor: "transparent", opacity: 0.85 }}
                />
                <span className="font-mono text-xs">creating account…</span>
              </>
            ) : (
              "Create account"
            )}
          </span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
        </button>
      </form>
    </AuthLayout>
  );
}