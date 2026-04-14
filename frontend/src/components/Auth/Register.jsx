import { useState } from "react";
import { registerUser } from "../../api/auth";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const register = async () => {
    try {
      setLoading(true);
      setError("");

      await registerUser(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
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
          Create Account 🚀
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Start using Devguard AI today
        </p>

        {/* NAME */}
        <input
          type="text"
          placeholder="Full Name"
          className="w-full mb-3 p-3 rounded-lg 
          bg-black border border-gray-700 
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-3 rounded-lg 
          bg-black border border-gray-700 
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-3 rounded-lg 
          bg-black border border-gray-700 
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {/* ERROR */}
        {error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}

        {/* BUTTON */}
        <button
          onClick={register}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-medium transition-all duration-300
          ${
            loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105"
          } text-white`}
        >
          {loading ? "Creating..." : "Register"}
        </button>

        {/* FOOTER */}
        <p className="text-sm text-center mt-6 text-gray-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}