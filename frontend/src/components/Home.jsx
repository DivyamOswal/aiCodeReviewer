import { Link } from "react-router-dom";

export default function Home() {
  const token = localStorage.getItem("token");

  return (
    <div className="min-h-screen flex items-center justify-center 
    bg-gradient-to-br from-gray-900 via-gray-800 to-black px-6 text-white">

      <div className="max-w-3xl text-center">

        {/* TITLE */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 
        bg-gradient-to-r from-indigo-400 to-purple-500 
        bg-clip-text text-transparent">
          Devguard AI
        </h1>

        <p className="text-lg text-gray-300 mb-6">
          AI-powered code reviewer that analyzes your GitHub repositories
          for bugs, security issues, performance bottlenecks, and best practices.
        </p>

        {/* BUTTONS */}
        <div className="flex justify-center gap-4 flex-wrap">
          {token ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-lg 
              bg-gradient-to-r from-green-500 to-emerald-600 
              hover:scale-105 transition"
            >
              🚀 Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-6 py-3 rounded-lg 
                bg-gradient-to-r from-indigo-500 to-purple-600 
                hover:scale-105 transition"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="px-6 py-3 rounded-lg border border-white/20 
                hover:bg-white/10 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* FEATURES */}
        <div className="mt-10 grid md:grid-cols-3 gap-6 text-sm">

          <Feature title="AI Bug Detection" desc="Find issues instantly" />
          <Feature title="Security Analysis" desc="Detect vulnerabilities" />
          <Feature title="Smart Reports" desc="Download insights as PDF" />

        </div>
      </div>
    </div>
  );
}

/* FEATURE CARD */
function Feature({ title, desc }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl 
    border border-white/10 rounded-xl p-5 text-center 
    hover:scale-105 transition">

      <h3 className="font-semibold text-indigo-400 mb-1">
        {title}
      </h3>

      <p className="text-gray-400 text-xs">
        {desc}
      </p>
    </div>
  );
}