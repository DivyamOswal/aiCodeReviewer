import { Link } from "react-router-dom";

export default function Navbar({ isAuth }) {
  return (
    <nav className="bg-gray-900 text-white px-8 py-4 flex justify-between">
      <h1 className="font-bold text-xl">Devguard AI</h1>

      <div className="space-x-4">
        {!isAuth ? (
          <>
            <Link to="/login" className="hover:text-indigo-400">Login</Link>
            <Link to="/register" className="hover:text-indigo-400">Register</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/history">History</Link>
            <button
              className="text-red-400"
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
