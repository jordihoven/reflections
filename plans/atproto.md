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
        "required": ["text", "createdAt"],
        "properties": {
          "text": { "type": "string", "maxLength": 1000 },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

Attachments (blobs) added in a later step.

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

### Step 8: Attachments via PDS blobs (later)

- Upload file: `agent.com.atproto.repo.uploadBlob(file)`
- Returns blob ref, attach to record
- Replaces base64 data URL approach
- PDS enforces its own size limits

## Open questions (need your input)

- [x] **Domain:** `reflections-gules.vercel.app` (Vercel). Update client metadata when custom domain lands.
- [x] **Lexicon NSID:** `app.reflections.reflection` (resolved in reflections.md). Still swap before real users write records — NSID needs a domain you own.
- [ ] **Scope granularity:** `atproto repo:app.reflections.reflection` for v1 (per docs, repo collections are Lexicon scopes). Add `blob:*/*` when attachments (step 8) land.
