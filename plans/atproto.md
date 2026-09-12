# ATProto Integratnot ion

## Goal

Replace localStorage with ATProto. Users log in with their ATProto handle, reflections + attachments stored on their own PDS. App stores nothing.

## Dependencies

```
@atproto/oauth-client-browser  — handles OAuth (DPoP, PKCE, token refresh, IndexedDB sessions)
@atproto/api                   — PDS CRUD (createRecord, listRecords, deleteRecord, uploadBlob)
```

## Lexicon

NSID: TBD — needs a domain you own (e.g., `app.reflections.entry` once you buy one). Vercel subdomain won't work for NSID convention.

```json
{
  "lexicon": 1,
  "id": "<TBD>.reflections.entry",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["createdAt"],
        "properties": {
          "text": { "type": "string", "maxLength": 1000 },
          "createdAt": { "type": "string", "format": "datetime" },
          "attachments": {
            "type": "array",
            "maxLength": 10,
            "items": {
              "type": "object",
              "required": ["blob"],
              "properties": {
                "name": { "type": "string" },
                "blob": { "type": "blob" }
              }
            }
          }
        }
      }
    }
  }
}
```

Records are written as raw JSON (no lexicon validation) today — schema above is the target for real-world interop later.

## Architecture

```
app/
  lib/
    atproto.ts          — OAuth client singleton, session state, PDS helpers
  components/
    login.tsx           — handle input + sign in button
    composer.tsx         — (existing, swap onPost to PDS write)
    reflection-item.tsx  — (existing, no change)
  oauth/
    callback/
      page.tsx          — OAuth redirect landing, calls client.init()
  client-metadata.json   — static route, OAuth client identity
  page.tsx              — guarded: show login or feed based on session
```

## Implementation steps

### Step 1: Install dependencies

```bash
npm install @atproto/oauth-client-browser @atproto/api
```

### Step 2: Client metadata route

Static JSON served at `/client-metadata.json`. Needs the app's public URL (Vercel deploy URL or custom domain).

```json
{
  "client_id": "https://reflections-gules.vercel.app/client-metadata.json",
  "client_name": "Reflections",
  "client_uri": "https://reflections-gules.vercel.app",
  "redirect_uris": ["https://reflections-gules.vercel.app/oauth/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "atproto transition:generic",
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

### Step 3: OAuth callback page

`app/oauth/callback/page.tsx` — client component that calls `client.init()` on mount, then redirects to `/`.

### Step 4: Auth module (`lib/atproto.ts`)

- Create `BrowserOAuthClient` singleton with client metadata + handle resolver
- Export `signIn(handle)` — triggers OAuth redirect
- Export `signOut()` — clears session
- Export `getAgent()` — returns authenticated Agent or null
- Session restore on app load via `client.init()`

### Step 5: Login screen

Simple component: handle text input + "Sign in" button. Shown when no active session.

### Step 6: Wire up page.tsx

- On load: check session via `client.init()`
- Authenticated: show composer + feed (existing UI)
- Not authenticated: show login screen
- Add sign out button

### Step 7: Replace localStorage CRUD

- **Create:** `agent.com.atproto.repo.createRecord({ repo: did, collection: '<TBD>.reflections.entry', record: { text, createdAt } })`
- **List:** `agent.com.atproto.repo.listRecords({ repo: did, collection: '<TBD>.reflections.entry' })`
- **Delete:** `agent.com.atproto.repo.deleteRecord({ repo: did, collection: '<TBD>.reflections.entry', rkey })`
- Remove `useSyncExternalStore` localStorage machinery from page.tsx

### Step 8: Attachments via PDS blobs

Files are uploaded as ATProto blobs; the reflection record references them. PDS is the sole size/count authority — no client caps.

**Scope change (breaking — forces re-auth):**

- `app/lib/atproto.ts` `SCOPE` → `atproto transition:generic`
- `public/client-metadata.json` `scope` → same
- Why not granular `repo:... blob:write`: granular scopes are optional to support, so some PDSes reject them → login/upload fails for those users. `transition:generic` is universally supported (old app-password level: write any record + upload blobs) and is the ecosystem default.
- ⚠️ `atproto` alone is **auth-only** — grants zero resource access. It MUST be paired with `transition:generic` (or granular scopes) for any repo read/write or blob upload. Learn from step 8's first attempt.
- Scope lives in the access token → everyone must re-login once.

**Record schema change:**

- `attachments`: array of `{ name?, blob: { $type: "blob", ref: { $link }, mimeType, size } }`
- `name` preserves the original filename (blob itself carries none) — used for download links
- Blob object must keep the standard `$type: "blob"` shape so PDS GC recognizes the reference and doesn't sweep a live blob

**Upload flow** (`createReflection`):

- composer holds `Attachment[]` with the original `File` for upload
- per file: `agent.com.atproto.repo.uploadBlob(file)` → `BlobRef{ ref: CID, mimeType, size }`, sequential (no parallel burst on big files)
- collect refs into `record.attachments`, then `createRecord`
- upload failure → friendly surface of the PDS error (= PDS's real limit), nothing persisted

**Read/render flow:**

- PDS base URL comes from the OAuth token's `aud` (`session.getTokenInfo().aud`) — the resolved PDS URL, correct even behind entryways, NOT `agent.pdsUrl` (doesn't exist on the new `Agent`)
- blob URL per attachment: `<pds>/xrpc/com.atproto.sync.getBlob?did=<did>&cid=<cid>`
- images → `<img src=blobUrl>`; everything else → `<a download>` chip (downloadable objects, no inline fetch/render)
- already-persisted reflections render from PDS blobs, not data URLs

**Gotchas learned in session:**

- **`atproto` scope alone 401s every write** — it's auth-only. `transition:generic` is what actually grants blob upload + record writes.
- **The 401-then-200 you see in the network tab is normal** — public-client access tokens are short-lived (~5 min); the SDK auto-refreshes on the first 401 and retries transparently.
- **Decoding blob refs from read records is shape-dependent** — a blob ref may come back as `{$link: string}`, a CID object (has `.toString()`), or a `BlobRef` instance (extra `.original`). The `blobCid()` helper in `atproto.ts` handles all three; skip the attachment if no CID resolves (never emit `cid=undefined`).
- **Optimistic post** — render text + image from composer local data instantly, then swap in the persisted record. Kills the perceived post latency and the "image loads in later" effect.
- **Entryway PDSes unverified** — `aud`-derived base should cover them, but only a direct PDS has been exercised.

**Blob deletion:** `deleteRecord` removes only the record. Orphaned blobs are swept by PDS garbage-collection (no `deleteBlob` endpoint). Erasure is eventual, not instant — never promise immediate deletion.

## Open questions (need your input)

- [x] **Domain:** `reflections-gules.vercel.app` (Vercel). Update client metadata when custom domain lands.
- [x] **Lexicon NSID:** `app.reflections.reflection` (resolved in reflections.md). Still swap before real users write records — NSID needs a domain you own.
- [x] **Scope:** `atproto transition:generic` (step 8). Granular (`repo:... blob:write`) rejected — optional-to-support on PDSes, breaks other users' logins. Plain `atproto` rejected too — auth-only, grants no blob/repo access.
