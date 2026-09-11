<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# follow these rules

- never commit. i commit, you may let me know you think we're ready to commit, but you NEVER commit.
- do not assume. i am the assumer. ask me to make assumptions.

# theming

- dark mode follows `prefers-color-scheme` only. no toggle, no JS, no `dark:` utility classes.
- colors are Tailwind v4 semantic tokens (card, border, hover, subtle, inverse, background, foreground, muted) defined in `app/globals.css` under `@theme` (NOT `@theme inline` — inline bakes literal values into utilities and breaks the dark override); dark values override the same `--color-*` vars in an `@media (prefers-color-scheme: dark)` block on `:root`.
- new colors: add a token to `@theme` + dark override. never hardcode hex or zinc/white utilities.
