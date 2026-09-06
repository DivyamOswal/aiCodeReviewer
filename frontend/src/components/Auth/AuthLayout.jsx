// frontend/src/components/Auth/AuthLayout.jsx
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

function CodeVerityLogo({ size = "h-11 w-11", iconSize = 20 }) {
  return (
    <div
      className={`relative flex ${size} shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] shadow-[0_0_0_1px_var(--accent-soft-strong),var(--shadow-lg)]`}
    >
      <div className="absolute inset-[1px] rounded-[10px] bg-[var(--bg-primary)]" />
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative text-[var(--accent)]"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-md bg-[var(--bg-secondary)] border border-[var(--border-light)]">
        <span className="font-mono text-[6px] font-bold text-[var(--accent)]">&lt;/&gt;</span>
      </div>
      <span className="absolute -top-0.5 -left-0.5 h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
    </div>
  );
}

function FeatureRow({ children }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-soft)]">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {children}
    </li>
  );
}

export default function AuthLayout({ title, terminalText, error, onOAuth, footer, children }) {
  const cornersRef = useRef([]);
  const cursorRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  // GSAP is used ONLY for infinite/looping ambient animation here.
  // One-shot entrances (card, fields, footnote) run on plain CSS
  // (.animate-fadeUp) so they can never get stuck invisible if a
  // JS effect fires late or twice see chat note on the button bug.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.to(cornersRef.current, {
        opacity: 0.9,
        duration: 1.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.15,
      });

      if (cursorRef.current) {
        gsap.to(cursorRef.current, {
          opacity: 0,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      }

      gsap.to(orb1Ref.current, { x: 18, y: -14, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(orb2Ref.current, { x: -16, y: 12, duration: 10, repeat: -1, yoyo: true, ease: "sine.inOut" });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* ===== LEFT PANEL – Form =====
          no-scrollbar: if a very short viewport genuinely needs to
          scroll, it does so silently instead of showing a scrollbar. */}
      <div className="no-scrollbar flex w-full flex-1 items-center justify-center overflow-y-auto bg-[var(--bg-primary)] p-4 sm:p-6 lg:w-1/2">
        <div className="w-full max-w-md py-4">
          {/* Wordmark (mobile only) */}
          <div className="animate-fadeUp mb-5 text-center lg:hidden">
            <div className="inline-flex items-center gap-2">
              <CodeVerityLogo size="h-8 w-8" iconSize={15} />
              <span className="font-mono text-sm font-bold tracking-[0.2em] text-[var(--text-primary)]">
                CodeVerity
              </span>
            </div>
          </div>

          {(title || terminalText) && (
            <div className="animate-fadeUp mb-5 space-y-1.5">
              {title && (
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
              )}
              {terminalText && (
                <p className="font-mono text-xs text-[var(--text-muted)]">
                  <span className="text-[var(--accent)]">$</span> {terminalText}
                  <span ref={cursorRef} className="ml-0.5 inline-block h-3 w-[6px] translate-y-[1px] bg-[var(--accent)]" />
                </p>
              )}
            </div>
          )}

          {/* Card */}
          <div className="animate-fadeUp relative" style={{ animationDelay: "80ms" }}>
            <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />

            {[
              "-top-px -left-px rounded-tl-2xl border-t-2 border-l-2",
              "-top-px -right-px rounded-tr-2xl border-t-2 border-r-2",
              "-bottom-px -left-px rounded-bl-2xl border-b-2 border-l-2",
              "-bottom-px -right-px rounded-br-2xl border-b-2 border-r-2",
            ].map((cls, i) => (
              <span
                key={cls}
                ref={(el) => (cornersRef.current[i] = el)}
                className={`absolute h-4 w-4 border-[var(--accent)]/50 ${cls}`}
              />
            ))}

            <div className="relative space-y-3.5 overflow-visible rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-md),0_30px_60px_-35px_var(--accent-soft-strong)] sm:p-7">
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-danger-soft)] px-4 py-3 font-mono text-xs text-[var(--color-danger)]"
                >
                  error: {error}
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onOAuth("github")}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-white/[0.04] py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--accent)]/40 hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <GitHubIcon className="h-4 w-4" />
                  Continue with GitHub
                </button>
                <button
                  type="button"
                  onClick={() => onOAuth("google")}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-white/[0.04] py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--accent)]/40 hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <GoogleIcon className="h-4 w-4" />
                  Continue with Google
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border-light)]" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">or</span>
                <div className="h-px flex-1 bg-[var(--border-light)]" />
              </div>

              {children}

              {footer && (
                <p className="text-center text-sm text-[var(--text-muted)]">
                  {footer.question}{" "}
                  <Link
                    to={footer.linkTo}
                    className="text-[var(--accent)] transition-colors duration-200 hover:text-[var(--accent-hover)]"
                  >
                    {footer.linkText}
                  </Link>
                </p>
              )}
            </div>
          </div>

          <p className="animate-fadeUp mt-4 text-center font-mono text-[11px] tracking-wide text-[var(--text-muted)]" style={{ animationDelay: "160ms" }}>
            CodeVerity · AI Repository Intelligence
          </p>
        </div>
      </div>

      {/* ===== RIGHT PANEL – Brand side ===== */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-[var(--bg-secondary)] p-12 lg:flex">
        <div ref={orb1Ref} className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div ref={orb2Ref} className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-70" />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(var(--accent) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 max-w-sm text-center">
          <div className="animate-fadeUp relative inline-block">
            <div className="absolute -inset-4 rounded-2xl bg-[var(--accent-soft)] blur-2xl" />
            <div className="relative inline-flex items-center gap-3">
              <CodeVerityLogo size="h-14 w-14" iconSize={28} />
              <span className="font-mono text-2xl font-bold tracking-[0.15em] text-[var(--text-primary)]">
                CodeVerity
              </span>
            </div>
          </div>

          <h2 className="animate-fadeUp mt-8 text-4xl font-semibold leading-tight text-[var(--text-primary)]" style={{ animationDelay: "80ms" }}>
            AI Code Intelligence
          </h2>

          <p className="animate-fadeUp mt-4 text-sm leading-relaxed text-[var(--text-secondary)]" style={{ animationDelay: "140ms" }}>
            Secure, AI-powered repository analysis.
            <br />
            Ship with confidence.
          </p>

          <ul className="animate-fadeUp mt-6 space-y-2.5 text-left" style={{ animationDelay: "200ms" }}>
            <FeatureRow>Deep static + AI-driven code review</FeatureRow>
            <FeatureRow>Native GitHub repo integration</FeatureRow>
            <FeatureRow>Actionable, developer-first reports</FeatureRow>
          </ul>

          <div className="animate-fadeUp mt-8 flex items-center justify-center gap-3 text-xs font-mono text-[var(--text-muted)]" style={{ animationDelay: "260ms" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
            </span>
            <span>System online</span>
          </div>

          <div className="mx-auto mt-8 h-px w-24 bg-[var(--accent)]/30" />
        </div>

        <p className="absolute bottom-6 left-0 right-0 text-center font-mono text-[10px] text-[var(--text-muted)] tracking-wider opacity-60">
          CodeVerity · All rights reserved
        </p>
      </div>
    </div>
  );
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.5 0 12.3c0 5.44 3.44 10.05 8.21 11.68.6.12.82-.27.82-.6 0-.3-.01-1.08-.02-2.12-3.34.75-4.04-1.64-4.04-1.64-.55-1.44-1.34-1.82-1.34-1.82-1.09-.77.08-.75.08-.75 1.21.09 1.73 1.28 1.73 1.28 1.07 1.87 2.81 1.33 3.5 1.02.11-.79.42-1.33.76-1.64-2.67-.31-5.47-1.38-5.47-6.15 0-1.36.47-2.47 1.24-3.34-.12-.31-.54-1.57.12-3.28 0 0 1.01-.33 3.3 1.28a11.3 11.3 0 0 1 6 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.24 1.98 1.24 3.34 0 4.78-2.63 5.27-5.13 5.55.4.35.76 1.05.76 2.12v3.15c0 .3.2.65.78.54a11.27 11.27 0 0 0 7.67-10.68C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  );
}

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A11.998 11.998 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}