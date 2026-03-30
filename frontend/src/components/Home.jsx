import { Link } from "react-router-dom";

export default function Home() {
  const token = localStorage.getItem("token");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="bg-white p-10 rounded-xl shadow-xl max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">
          AI-Powered Code Reviewer
        </h1>

        <p className="text-gray-600 mb-6">
          Upload your GitHub repository or source code and get instant insights
          on bugs, security issues, performance bottlenecks, and improvements.
        </p>

        {/* ACTION BUTTONS */}
        <div className="flex justify-center gap-4">
          {token ? (
            <Link
              to="/dashboard"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* FEATURES */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-gray-500">
          <div>✔ AI Bug Detection</div>
          <div>✔ Security Analysis</div>
          <div>✔ Downloadable Reports</div>
        </div>
      </div>
    </div>
  );
}
