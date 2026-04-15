import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

/* ── PARTICLE FIELD ─────────────────────────── */
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 60 }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      r:  Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      o:  Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.o})`;
        ctx.fill();
      });

      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}

/* ── ANIMATED BADGE ─────────────────────────── */
function Badge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
      border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium
      mb-6 animate-[fadeDown_0.6s_ease_both]">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
      Powered by AI · Now in Beta
    </div>
  );
}

/* ── TYPING EFFECT ──────────────────────────── */
function TypedWord({ words }) {
  const [index, setIndex]   = useState(0);
  const [text,  setText]    = useState("");
  const [del,   setDel]     = useState(false);

  useEffect(() => {
    const word   = words[index % words.length];
    const speed  = del ? 40 : 90;
    const pause  = del ? 0 : 1400;

    if (!del && text === word) {
      const t = setTimeout(() => setDel(true), pause);
      return () => clearTimeout(t);
    }
    if (del && text === "") {
      setDel(false);
      setIndex((i) => i + 1);
      return;
    }

    const t = setTimeout(() => {
      setText(del ? text.slice(0, -1) : word.slice(0, text.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [text, del, index, words]);

  return (
    <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
      {text}
      <span className="animate-[blink_0.9s_step-end_infinite] text-violet-400">|</span>
    </span>
  );
}

/* ── FEATURE CARD ───────────────────────────── */
function Feature({ icon, title, desc, delay, color }) {
  const [hovered, setHovered] = useState(false);

  const colors = {
    violet:  { border: "hover:border-violet-500/50",  glow: "hover:shadow-violet-500/10",  icon: "text-violet-400",  bg: "bg-violet-500/10"  },
    fuchsia: { border: "hover:border-fuchsia-500/50", glow: "hover:shadow-fuchsia-500/10", icon: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
    cyan:    { border: "hover:border-cyan-500/50",    glow: "hover:shadow-cyan-500/10",    icon: "text-cyan-400",    bg: "bg-cyan-500/10"    },
  }[color];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative group bg-white/[0.03] backdrop-blur-xl border border-white/8
        rounded-2xl p-6 text-left overflow-hidden cursor-default
        transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl
        ${colors.border} ${colors.glow}
        animate-[fadeUp_0.6s_ease_both]`}
      style={{ animationDelay: delay, animationFillMode: "both" }}
    >
      {/* glow blob */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-0
        group-hover:opacity-30 transition-opacity duration-500 ${colors.bg}`} />

      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-4
        transition-transform duration-300 ${hovered ? "scale-110" : ""}`}>
        <span className={`text-xl ${colors.icon}`}>{icon}</span>
      </div>
      <h3 className="font-semibold text-white mb-1.5 text-sm tracking-wide">{title}</h3>
      <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── STAT PILL ──────────────────────────────── */
function StatPill({ value, label }) {
  return (
    <div className="flex flex-col items-center px-6 py-3 rounded-2xl bg-white/[0.04] border border-white/8">
      <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
      <span className="text-gray-500 text-xs mt-0.5">{label}</span>
    </div>
  );
}

/* ── SCAN LINE EFFECT ───────────────────────── */
function ScanLine() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent
        animate-[scanline_3s_ease-in-out_infinite]" />
    </div>
  );
}

/* ── HOME PAGE ──────────────────────────────── */
export default function Home() {
  const token    = localStorage.getItem("token");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center
      bg-[#080810] px-6 text-white overflow-hidden">

      {/* bg radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-[700px] h-[700px] rounded-full pointer-events-none
        bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12)_0%,transparent_70%)]" />

      <ParticleField />

      {/* ── CONTENT ─────────────────────────── */}
      <div className={`relative z-10 max-w-3xl w-full text-center transition-all duration-700 ease-out
        ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>

        <Badge />

        {/* HEADING */}
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-2 tracking-tight
          animate-[fadeUp_0.6s_0.1s_ease_both] [animation-fill-mode:both]">
          <span className="text-white">Devguard</span>
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400
            bg-clip-text text-transparent"> AI</span>
        </h1>

        {/* TYPED SUBTITLE */}
        <p className="text-xl md:text-2xl font-medium mb-5 h-8
          animate-[fadeUp_0.6s_0.2s_ease_both] [animation-fill-mode:both]">
          <TypedWord words={["Finds your bugs.", "Flags vulnerabilities.", "Generates tests.", "Ships confidence."]} />
        </p>

        <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed
          animate-[fadeUp_0.6s_0.3s_ease_both] [animation-fill-mode:both]">
          Drop any public GitHub URL and get a full AI-powered audit architecture analysis,
          security scan, bug report, and auto-generated tests in under 60 seconds.
        </p>

        {/* BUTTONS */}
        <div className="flex justify-center gap-3 flex-wrap mb-10
          animate-[fadeUp_0.6s_0.4s_ease_both] [animation-fill-mode:both]">
          {token ? (
            <Link
              to="/dashboard"
              className="group relative px-7 py-3 rounded-xl font-semibold text-sm
                bg-gradient-to-r from-violet-600 to-fuchsia-600
                hover:from-violet-500 hover:to-fuchsia-500
                hover:scale-105 hover:shadow-xl hover:shadow-violet-500/25
                active:scale-95 transition-all duration-200 overflow-hidden"
            >
              <ScanLine />
              🚀 Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="group relative px-7 py-3 rounded-xl font-semibold text-sm
                  bg-gradient-to-r from-violet-600 to-fuchsia-600
                  hover:from-violet-500 hover:to-fuchsia-500
                  hover:scale-105 hover:shadow-xl hover:shadow-violet-500/25
                  active:scale-95 transition-all duration-200 overflow-hidden"
              >
                <ScanLine />
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-7 py-3 rounded-xl font-semibold text-sm border border-white/15
                  bg-white/[0.04] hover:bg-white/[0.09] hover:border-white/25
                  hover:scale-105 active:scale-95 transition-all duration-200 backdrop-blur"
              >
                Get Started Free →
              </Link>
            </>
          )}
        </div>

        {/* STATS ROW */}
        <div className="flex justify-center gap-3 flex-wrap mb-12
          animate-[fadeUp_0.6s_0.5s_ease_both] [animation-fill-mode:both]">
          <StatPill value="100+" label="Repos Scanned" />
          <StatPill value="98%"  label="Issue Accuracy" />
          <StatPill value="<60s" label="Avg Audit Time" />
        </div>

        {/* FEATURE CARDS */}
        <div className="grid md:grid-cols-3 gap-4">
          <Feature
            icon="🐛" title="AI Bug Detection"
            desc="Pinpoints logic errors, edge cases, and anti-patterns across your entire codebase."
            color="violet" delay="0.55s"
          />
          <Feature
            icon="🔐" title="Security Analysis"
            desc="Scans for OWASP vulnerabilities, exposed secrets, and injection risks instantly."
            color="fuchsia" delay="0.65s"
          />
          <Feature
            icon="📄" title="Smart PDF Reports"
            desc="One-click export of your full audit with scores, grades, and a fix roadmap."
            color="cyan" delay="0.75s"
          />
        </div>

        {/* FOOTER NOTE */}
        <p className="text-gray-600 text-xs mt-10
          animate-[fadeUp_0.6s_0.85s_ease_both] [animation-fill-mode:both]">
          No credit card required · Works with any public GitHub repo
        </p>
      </div>

      <style>{`
        @keyframes fadeUp   { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes fadeDown { from { transform:translateY(-10px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes blink    { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes scanline { 0% { top:-2px; opacity:0 } 10% { opacity:1 } 90% { opacity:1 } 100% { top:100%; opacity:0 } }
      `}</style>
    </div>
  );
}