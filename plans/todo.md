# Todos

# Bugs 🐛

- on mobile, the composer posts on enter. enter on mobile should be newline, only the button should post.
- ...

# Features 🚀

- rename reflections to thoughts, or Yuragi?

- swipe gestures: left/right on thought = select, down on page = refresh
- back to top when composer is out of view OR fixed composer so thoughts flow underneath?

- when thought is selected, show actions (edit, delete, link) for all selected (show count of selected)

- edit attachments

- Add b, italic and underline style. maybe even background colors
- Add lists support
- Add rich styled links

- /thought page, showing content of thought + login + like + comment? design this first

- .select style: outline, muted primary
- .active style: outline, muted secondary
- transition on the composer shrinking back to 'normal' size after posting

- infinite loader on thoughts -> load 20 first, then when reach bottom, load 10 more etc?

- on /login, show a firehose? of thoughts on the lexicon (like arabica coffee loggers login!)

- reply on a thought = link (parent/child)
- link thought action (this needs more thinking!)

- auto delete thoughts: if >1 week old && unlinked, delete thought.
- review session: tend to unlinked thoughts (before they get deleted)

# AI...

## Attachments (atproto blobs)

Status: **done** (PDS-backed, no client caps) — see `atproto.md` step 8.

## What works

- **Add files** via icon button (`AddFilesButton`, `app/components/attachments.tsx`) or **drag & drop anywhere on the composer** (whole composer is the drop target, shows highlight ring)
- **No client caps** — 4-file and 1MB limits removed; the PDS is the sole size/count authority, rejection surfaced as a friendly error
- **Accepted types:** `image/*` (incl. GIFs), `audio/*`, `text/plain`, `text/markdown`, `text/md`; disallowed types dropped with an inline notice (drag + picker)
- Files uploaded as **ATProto blobs** (`uploadBlob`); reflection record references them (`{ name?, blob: { $type: "blob", ref, mimeType, size } }`)
- Composer previews from local data URLs; **optimistic post** renders text + image instantly, swaps to the persisted PDS-backed record when upload+write land
- Feed renders images from PDS blob URLs, non-images as **download chips**
- Post enabled with text OR files (attachments-only reflections allowed)
- Upload failure → alert with the PDS's error message (its limits are the only limits)

## Gaps

- **No test** for the file-processing paths (`filesToAttachments`, blob ref decode)
- **Blob deletion is eventual, not instant** — `deleteRecord` drops the record; PDS GC sweeps orphaned blobs. No `deleteBlob` endpoint.
- **Entryway PDSes untested** — blob base is derived from the token `aud` (should handle them), but only verified against a direct PDS

## Toast notifications

- Currently only one toast scenario (skipped files). Not worth a dependency yet.
- When atproto lands (auth errors, upload failures, sync status), add [sonner](https://sonner.emilkowal.ski/) — tiny, no provider wrapper needed.

## Later (check before building — product owner)

- Login onboarding: explain what atproto is + link to create an account (e.g. Bluesky register). Non-technical users type email, see nothing, and bounce.
- Clipboard paste (cmd+v image into composer)
- Video support (blobs allow it now; old "too big for localStorage" blocker is gone — just revisit)
- Captions / alt-text per attachment (already deferred in `reflections.md`)
- Reorder / drag attachments
- Always-visible size/type error instead of inline notice
- Failed-upload alerting (partially covered by the optimistic-post alert)
