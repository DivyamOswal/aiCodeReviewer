// frontend/src/components/Auth/Login.jsx
import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import axios from "../../api/axios";
import { useAuth } from "../../App";

export default function Login() {
  const navigate      = useNavigate();
  const { login }     = useAuth();          // ← context login, not localStorage directly
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields.");

    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/auth/login", { email, password });
      const token = res.data.token;

      // ✅ This updates React state — Navbar re-renders immediately, no refresh needed
      login(token);

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to your Devguard AI account</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-5">

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10
                  text-white placeholder-gray-600 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10
                  text-white placeholder-gray-600 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm
                bg-gradient-to-r from-indigo-500 to-purple-600
                hover:from-indigo-400 hover:to-purple-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all hover:scale-[1.02] active:scale-100 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <NavLink to="/register" className="text-indigo-400 hover:underline">
              Register
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
}