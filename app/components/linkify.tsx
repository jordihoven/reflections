import type { ReactNode } from "react";

const URL_RE = /((?:https?:\/\/)?[-\w]+(?:\.[-\w]+)+(?:\/[\w\-./?%&=@:~+#]*)?)/gi;

function toLink(match: string): { href: string; label: string; tail: string } {
  const parts = match.match(/^(.+?)([.,;:!?]*)$/);
  const body = parts?.[1] ?? match;
  const tail = parts?.[2] ?? "";
  let host = body;
  let path = "";
  const slash = body.indexOf("/");
  if (slash !== -1) {
    host = body.slice(0, slash);
    path = body.slice(slash);
  }
  const href = /^https?:\/\//i.test(body)
    ? body
    : `https://${/^www\./i.test(host) ? "" : "www."}${host}${path}`;
  return { href, label: body, tail };
}

export function linkify(text: string, underline = true): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const { href, label, tail } = toLink(m[0]);
    out.push(
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-primary ${
          underline
            ? "underline decoration-primary/50 underline-offset-2 transition-colors duration-200 hover:decoration-primary"
            : ""
        }`}
      >
        {label}
      </a>,
    );
    if (tail) out.push(tail);
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}