"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, suggestHandles } from "../lib/atproto";
import type { HandleSuggestion } from "../lib/atproto";

const MIN_QUERY = 2;

export function Login() {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<HandleSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  const picked = useRef(false);

  useEffect(() => {
    if (picked.current) return;
    const q = handle.trim();
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      if (q.length < MIN_QUERY) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      suggestHandles(q)
        .then((actors) => {
          if (requestId.current === id) {
            setSuggestions(actors);
            setOpen(true);
          }
        })
        .catch(() => {}); // suggestion lookup is optional; never block login
    }, 250);
    return () => clearTimeout(timer);
  }, [handle]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    signIn(handle).catch((err) => {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    });
  };

  const pick = (s: HandleSuggestion) => {
    picked.current = true;
    setOpen(false);
    setHandle(s.handle);
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-sm flex-col gap-3"
    >
      <div className="text-center">
        <h2 className="font-semibold text-foreground">
          Login with your Atmosphere account
        </h2>
        <p className="text-muted">Enter your handle</p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={handle}
          onChange={(e) => {
            picked.current = false;
            setHandle(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && open && suggestions[0]) {
              e.preventDefault();
              pick(suggestions[0]);
            }
          }}
          placeholder="yourhandle.bsky.social"
          autoFocus
          spellCheck={false}
          autoCapitalize="none"
          onBlur={() => setOpen(false)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {suggestions.map((s) => (
              <li key={s.handle}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-hover"
                >
                  {s.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatar}
                      alt=""
                      className="h-9 w-9 rounded-full bg-subtle"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle text-sm font-semibold text-muted">
                      {(s.handle[0] ?? "").toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      {s.displayName && (
                        <span className="truncate text-[14px] font-medium text-foreground">
                          {s.displayName}
                        </span>
                      )}
                      <span className="truncate font-mono text-[12px] text-muted">
                        @{s.handle}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        disabled={!handle.trim() || loading}
        className="flex cursor-pointer items-center justify-center rounded-xl border border-primary bg-primary px-3 py-2 text-[14px] font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-30"
      >
        {loading ? "Logging in..." : "Log In"}
      </button>
      {error && <p className="text-center text-[13px] text-red-500">{error}</p>}
    </form>
  );
}
