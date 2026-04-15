// frontend/src/components/Navbar.jsx
import { useState, useRef, useEffect, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";

function getInitials(token) {
  if (!token) return "U";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const name = payload.name ?? payload.email ?? "";
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  } catch {
    return "U";
  }
}

function getUserInfo(token) {
  if (!token) return { name: "", email: "" };
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      name: payload.name ?? "",
      email: payload.email ?? "",
    };
  } catch {
    return { name: "", email: "" };
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuth, token, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setDropOpen(false);
  }, [location.pathname]);

  const initials = useMemo(() => getInitials(token), [token]);
  const userInfo = useMemo(() => getUserInfo(token), [token]);

  const handleLogout = () => {
    setDropOpen(false);
    logout();
    navigate("/login");
  };

  const navLink = (to, label) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${
          isActive
            ? "bg-indigo-500/20 text-indigo-300"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        }`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* LOGO */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl"></span>
          <span className="font-bold text-violet-400 text-xl hidden sm:block">
            Devguard AI
          </span>
        </NavLink>

        {/* DESKTOP LINKS */}
        {isAuth && (
          <div className="hidden md:flex items-center gap-1">
            {navLink("/dashboard", "Dashboard")}
            {navLink("/history", "History")}
            
          </div>
        )}

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          {isAuth ? (
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen((p) => !p)}
                aria-label="Open user menu"
                aria-expanded={dropOpen}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600
                  flex items-center justify-center text-sm font-bold text-white
                  hover:scale-105 transition-all shadow-lg"
              >
                {initials}
              </button>

              {dropOpen && (
                <div
                  className="absolute right-0 top-12 w-52 bg-gray-900 border border-white/10
                  rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in"
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-semibold text-white truncate">
                      {userInfo.name || initials}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {userInfo.email || "Signed in"}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <DropItem
                      icon="👤"
                      label="Profile"
                      onClick={() => navigate("/profile")}
                    />
                    <DropItem
                      icon="⚙️"
                      label="Settings"
                      onClick={() => navigate("/settings")}
                    />
                    <DropItem
                      icon="📋"
                      label="History"
                      onClick={() => navigate("/history")}
                    />
                    <DropItem
                      icon="📊"
                      label="Dashboard"
                      onClick={() => navigate("/dashboard")}
                    />
                    
                  </div>

                  {/* Logout */}
                  <div className="border-t border-white/10 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400
                        hover:bg-red-500/10 transition text-left"
                    >
                      <span>🚪</span> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <NavLink
                to="/login"
                className="px-4 py-1.5 text-sm rounded-lg border border-white/10 text-gray-300
                  hover:bg-white/5 transition"
              >
                Sign in
              </NavLink>
              <NavLink
                to="/register"
                className="px-4 py-1.5 text-sm rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600
                  text-white hover:scale-105 transition"
              >
                Register
              </NavLink>
            </div>
          )}

          {/* MOBILE HAMBURGER */}
          {isAuth && (
            <button
              onClick={() => setMenuOpen((p) => !p)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="md:hidden text-gray-400 hover:text-white transition"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          )}
        </div>
      </div>

      {/* MOBILE MENU */}
      {isAuth && menuOpen && (
        <div className="md:hidden mt-3 pb-2 border-t border-white/10 pt-3 flex flex-col gap-1">
          {[
            ["/dashboard", "📊 Dashboard"],
           
            ["/history", "📋 History"],
            ["/profile", "👤 Profile"],
            ["/settings", "⚙️ Settings"],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-xl text-sm transition
                ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl text-left transition"
          >
            🚪 Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

function DropItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300
        hover:bg-white/5 hover:text-white transition text-left"
    >
      <span>{icon}</span> {label}
    </button>
  );
}