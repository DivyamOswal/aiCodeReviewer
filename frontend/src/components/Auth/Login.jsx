// frontend/src/components/Auth/Login.jsx
import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import axios from "../../api/axios";
import { useAuth } from "../../App";
import AuthLayout from "./AuthLayout";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/auth/login", { email, password });
      const token = res.data?.token ?? res.data?.accessToken;
      if (!token) {
        console.error("Login response had no token field:", res.data);
        setError("Login succeeded but no token was returned. Check the API response shape.");
        return;
      }
      login(token);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login request failed:", err);
      setError(err.response?.data?.error ?? "Login failed. Please try again.");
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
      title="Sign in to verify your repos"
      terminalText="awaiting credentials"
      error={error}
      onOAuth={handleOAuth}
      footer={{
        question: "Don't have an account?",
        linkText: "Register",
        linkTo: "/register",
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="animate-fadeUp space-y-1.5" style={{ animationDelay: "120ms" }}>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`${inputBase} ${inputBorder}`}
            />
          </div>
        </div>

        <div className="animate-fadeUp space-y-1.5" style={{ animationDelay: "190ms" }}>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]"
            >
              Password
            </label>
            <NavLink
              to="/forgot-password"
              className="text-xs text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--accent)]"
            >
              Forgot password?
            </NavLink>
          </div>
          <div className="group relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors duration-200 group-focus-within:text-[var(--accent)]" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`${inputBase} ${inputBorder}`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="animate-fadeUp group relative w-full overflow-hidden rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-all duration-300 hover:bg-[var(--accent-hover)] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
          style={{ animationDelay: "260ms" }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "var(--accent-contrast)", borderTopColor: "transparent", opacity: 0.85 }}
                />
                <span className="font-mono text-xs">verifying…</span>
              </>
            ) : (
              "Sign in"
            )}
          </span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
        </button>
      </form>
    </AuthLayout>
  );
}