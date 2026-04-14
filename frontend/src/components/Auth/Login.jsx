import { useState } from "react";
import { loginUser } from "../../api/auth";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const login = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await loginUser({ email, password });
      localStorage.setItem("token", res.data.token);

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center 
    bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">

      <div className="w-full max-w-md 
      bg-white/5 backdrop-blur-xl 
      border border-white/10 
      rounded-2xl shadow-2xl p-8">

        {/* HEADER */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Welcome Back 👋
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Login to continue to Devguard AI
        </p>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-3 rounded-lg 
          bg-black border border-gray-700 
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-3 rounded-lg 
          bg-black border border-gray-700 
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* ERROR */}
        {error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}

        {/* BUTTON */}
        <button
          onClick={login}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-medium transition-all duration-300
          ${
            loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105"
          } text-white`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* FOOTER */}
        <p className="text-sm text-center mt-6 text-gray-400">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-indigo-400 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}