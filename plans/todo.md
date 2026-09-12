# Todos

# Bugs 🐛

- on mobile, the composer posts on enter. enter on mobile should be newline, only the button should post.
- ...

# Features 🚀

## Dropzone when atproto lands

Status: image + audio + text support done (localStorage phase)

## What works

- **Add files** via icon button (`AddFilesButton`, `app/components/attachments.tsx`) or **drag & drop anywhere on the composer** (whole composer is the drop target, shows highlight ring)
- **Max 4 files per reflection**
- **Accepted types:** `image/*` (incl. GIFs), `audio/*`, `text/plain`, `text/markdown`, `text/md`
- **Per-file cap: ~1MB** — keeps 4 files under the ~5MB localStorage quota; oversized files are skipped with an inline notice
- Files stored as **base64 data URLs** in localStorage alongside the reflection
- Previews in composer: image thumbnails, non-images as name chips; each removable
- Feed renders attachments (images max-h-48, non-images as chips)
- Post enabled with text OR files (attachments-only reflections allowed)
- Quota overflow during save → alert (cache stays in memory; lost on reload)

## Gaps

- **No MIME validation on drop** — the `accept` filter only applies to the file picker; a dragged `.exe` is stored as a chip. Decide whether to hard-reject non-allowed types.
- **1MB cap, 4 file cap, MAX_LENGTH=1000** are constants in `composer.tsx` / `attachments.tsx`
- No test for the file-processing paths (`filesToAttachments`, quota guard)

## Toast notifications

- Currently only one toast scenario (skipped files). Not worth a dependency yet.
- When atproto lands (auth errors, upload failures, sync status), add [sonner](https://sonner.emilkowal.ski/) — tiny, no provider wrapper needed.

## Later (check before building — product owner)

- Login onboarding: explain what atproto is + link to create an account (e.g. Bluesky register). Non-technical users type email, see nothing, and bounce.
- Clipboard paste (cmd+v image into composer)
- Video support (skipped: too big for localStorage)
- Captions / alt-text per attachment (already deferred in `reflections.md`)
- Reorder / drag attachments
- Always-visible size/type error instead of inline notice
- Failed-upload alerting (partially covered by quota alert)

## When atproto lands

- Data URL → blob ref uploaded to PDS
- 1MB cap → PDS blob limits (surfaced on rejection)
- `Attachment.size` already kept in the type for limits/errors
