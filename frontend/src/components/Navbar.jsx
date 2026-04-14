import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

export default function Navbar({ isAuth }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef();

  /* MOUNT ANIMATION TRIGGER */
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  /* CLOSE DROPDOWN ON OUTSIDE CLICK */
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* NAV LINK */
  const navLink = (path, label) => {
    const active = location.pathname === path;
    return (
      <Link
        to={path}
        onClick={() => setMenuOpen(false)}
        className={`
          relative px-3 py-1.5 rounded-lg text-sm font-medium
          overflow-hidden transition-all duration-300 ease-out
          hover:-translate-y-px
          before:absolute before:inset-0 before:rounded-lg
          before:bg-white/5 before:scale-x-0 before:origin-left
          before:transition-transform before:duration-300
          hover:before:scale-x-100
          ${active
            ? "bg-indigo-500/20 text-indigo-300"
            : "text-gray-300 hover:text-white"
          }
        `}
      >
        {label}
      </Link>
    );
  };

  /* LOGOUT */
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav
      className={`
        sticky top-0 z-50
        bg-gradient-to-r from-gray-900 via-gray-800 to-black
        border-b border-white/10
        shadow-[0_4px_20px_rgba(0,0,0,0.6)]
        px-6 py-3 flex justify-between items-center
        transition-all duration-500 ease-out
        ${mounted ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}
      `}
    >
      {/* LOGO */}
      <h1
        onClick={() => navigate("/")}
        className="cursor-pointer text-lg md:text-xl font-bold
        bg-gradient-to-r from-indigo-400 to-purple-500
        bg-clip-text text-transparent
        transition-opacity duration-200 hover:opacity-75"
      >
        Devguard AI
      </h1>

      {/* DESKTOP NAV */}
      <div className="hidden md:flex items-center gap-3">
        {!isAuth ? (
          <>
            {navLink("/login", "Login")}
            <Link
              to="/register"
              className="px-4 py-1.5 rounded-lg text-sm font-medium
              bg-gradient-to-r from-indigo-500 to-purple-600
              text-white
              transition-all duration-200
              hover:scale-105 hover:shadow-[0_4px_16px_rgba(99,102,241,0.4)]
              active:scale-95"
            >
              Register
            </Link>
          </>
        ) : (
          <>
            {navLink("/dashboard", "Dashboard")}
            {navLink("/history", "History")}

            <div className="w-px h-5 bg-white/10 mx-2" />

            {/* AVATAR + DROPDOWN */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-9 h-9 rounded-full
                bg-gradient-to-r from-indigo-500 to-purple-600
                flex items-center justify-center
                text-white text-sm font-bold
                transition-all duration-200
                hover:scale-110 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]
                active:scale-95"
              >
                U
              </button>

              {/* DROPDOWN */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-44
                  bg-black/90 backdrop-blur-xl
                  border border-white/10 rounded-xl shadow-xl p-2
                  origin-top-right"
                  style={{
                    animation: "dropIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
                  }}
                >
                  {["Profile", "Settings"].map((item) => (
                    <button
                      key={item}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300
                      rounded-lg
                      transition-all duration-150
                      hover:bg-white/10 hover:text-white hover:translate-x-1"
                    >
                      {item}
                    </button>
                  ))}

                  <div className="border-t border-white/10 my-2" />

                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm text-red-400
                    rounded-lg
                    transition-all duration-150
                    hover:bg-red-500/10 hover:text-red-300 hover:translate-x-1"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* MOBILE BUTTON */}
      <button
        className="md:hidden text-gray-300 text-xl
        transition-transform duration-200
        hover:scale-110 active:scale-90"
        onClick={() => setMenuOpen((o) => !o)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* MOBILE MENU */}
      <div
        className={`
          absolute top-14 left-0 w-full
          bg-black/95 backdrop-blur-xl
          border-t border-white/10
          p-4 flex flex-col gap-3 md:hidden
          transition-all duration-300 ease-out
          ${menuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
          }
        `}
      >
        {!isAuth ? (
          <>
            {navLink("/login", "Login")}
            {navLink("/register", "Register")}
          </>
        ) : (
          <>
            {navLink("/dashboard", "Dashboard")}
            {navLink("/history", "History")}
            <div className="border-t border-white/10 my-2" />
            <button
              onClick={logout}
              className="text-left text-red-400 px-2 py-1 rounded
              transition-all duration-150
              hover:bg-red-500/10 hover:translate-x-1"
            >
              Logout
            </button>
          </>
        )}
      </div>

      {/* KEYFRAMES */}
      <style>{`
        @keyframes dropIn {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </nav>
  );
}