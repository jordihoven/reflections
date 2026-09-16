import { Agent } from "@atproto/api";
import {
  AtprotoDohHandleResolver,
  BrowserOAuthClient,
  type OAuthSession,
} from "@atproto/oauth-client-browser";
import type { Attachment, Reflection } from "../components/types";

export const COLLECTION = "app.reflections.reflection";
// `atproto` = auth-only. `transition:generic` = write any record + upload blobs.
// Universally supported across all PDSes (old app-password level).
export const SCOPE = "atproto transition:generic";

const CLIENT_ID = "https://reflections-gules.vercel.app/client-metadata.json";
const REFLECTION_LIMIT = 100;

const handleResolver = new AtprotoDohHandleResolver({
  dohEndpoint: "https://cloudflare-dns.com/dns-query",
});

let client: BrowserOAuthClient | null = null;
let agent: Agent | null = null;
let session: OAuthSession | null = null;
let pdsUrl: string | undefined;

function isLoopback(host: string) {
  return host === "127.0.0.1" || host === "localhost" || host === "[::1]" || host === "::1";
}

function loopbackClientMetadata(): string {
  const url = new URL(window.location.href);
  const redirectUri = `http://127.0.0.1${url.port ? `:${url.port}` : ""}/`;
  const params = new URLSearchParams({ scope: SCOPE, redirect_uri: redirectUri });
  return `http://localhost?${params.toString()}`;
}

async function getClient(): Promise<BrowserOAuthClient> {
  if (client) return client;
  // Loopback carve-out for local dev (no hosted metadata needed); public client elsewhere.
  client = await BrowserOAuthClient.load({
    clientId: isLoopback(window.location.hostname)
      ? loopbackClientMetadata()
      : CLIENT_ID,
    handleResolver,
  });
  return client;
}

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn" };

let authState: AuthState = { status: "loading" };
const listeners = new Set<() => void>();

function setAuthState(next: AuthState) {
  authState = next;
  listeners.forEach((cb) => cb());
}

export function subscribeAuth(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getAuthState(): AuthState {
  return authState;
}

let initPromise: Promise<void> | null = null;

export function initSession(): Promise<void> {
  initPromise ??= doInit();
  return initPromise;
}

async function doInit(): Promise<void> {
  try {
    const result = await (await getClient()).init();
    if (result?.session) {
      session = result.session;
      agent = new Agent(result.session);
      // token's `aud` is the resolved PDS base URL (correct even with entryways)
      pdsUrl = (await result.session.getTokenInfo()).aud;
      setAuthState({ status: "signedIn" });
    } else {
      setAuthState({ status: "signedOut" });
    }
  } catch {
    setAuthState({ status: "signedOut" });
  }
}

export type HandleSuggestion = {
  handle: string;
  displayName?: string;
  avatar?: string;
};

const PUBLIC_APPVIEW = "public.api.bsky.app";

export async function suggestHandles(
  q: string,
  limit = 6,
): Promise<HandleSuggestion[]> {
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  const res = await fetch(
    `https://${PUBLIC_APPVIEW}/xrpc/app.bsky.actor.searchActorsTypeahead?${params}`,
  );
  if (!res.ok) throw new Error("Suggestion lookup failed");
  const data = (await res.json()) as { actors: HandleSuggestion[] };
  return data.actors;
}

export async function signIn(handle: string) {
  await (await getClient()).signIn(handle.trim());
}

export async function signOut() {
  try {
    await session?.signOut();
  } catch {
    // already revoked/expired; clear locally anyway
  }
  session = null;
  agent = null;
  pdsUrl = undefined;
  setAuthState({ status: "signedOut" });
}

function requireAgent(): Agent {
  if (!agent) throw new Error("Not signed in");
  return agent;
}

function blobUrlFor(cid: string): string | undefined {
  if (!pdsUrl) return undefined;
  const url = new URL("/xrpc/com.atproto.sync.getBlob", pdsUrl);
  url.searchParams.set("did", agent!.assertDid);
  url.searchParams.set("cid", cid);
  return url.toString();
}

// A blob ref read back from the repo comes in one of several shapes depending
// on how the SDK decoded it: `{$link: string}`, a CID object (has toString),
// or a BlobRef instance (extra `original`). Handle all of them.
function blobCid(blob: unknown): string | undefined {
  if (!blob || typeof blob !== "object") return undefined;
  const b = blob as { ref?: unknown; original?: { ref?: unknown } };
  const ref = b.original?.ref ?? b.ref;
  if (!ref) return undefined;
  if (typeof ref === "string") return ref;
  const link = (ref as { $link?: unknown }).$link;
  if (typeof link === "string") return link;
  const toStr = (ref as { toString?: () => unknown }).toString;
  if (typeof toStr === "function") {
    const s = toStr.call(ref);
    if (typeof s === "string" && s) return s;
  }
  return undefined;
}

type StoredAttachment = {
  name?: string;
  blob: unknown;
};

function storedToAttachment(s: StoredAttachment): Attachment | undefined {
  const cid = blobCid(s.blob);
  if (!cid) return undefined;
  const blob = (s.blob ?? {}) as { mimeType?: string; size?: number };
  return {
    id: cid,
    name: s.name ?? "file",
    type: blob.mimeType ?? "application/octet-stream",
    size: blob.size ?? 0,
    url: blobUrlFor(cid),
  };
}

export async function listReflections(): Promise<Reflection[]> {
  const a = requireAgent();
  const { data } = await a.com.atproto.repo.listRecords({
    repo: a.assertDid,
    collection: COLLECTION,
    limit: REFLECTION_LIMIT,
    reverse: true,
  });
  return data.records
    .map(({ uri, value }) => {
      const v = value as {
        text?: string;
        createdAt: string;
        attachments?: StoredAttachment[];
      };
      return {
        id: uri,
        text: v.text ?? "",
        createdAt: v.createdAt,
        attachments: v.attachments
          ?.map(storedToAttachment)
          .filter((a): a is Attachment => a !== undefined),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReflection(
  text: string,
  attachments: Attachment[],
): Promise<{ reflection: Reflection; failedFiles: string[] }> {
  const a = requireAgent();
  const uploaded: StoredAttachment[] = [];
  const failedFiles: string[] = [];
  for (const att of attachments) {
    if (!att.file) continue;
    // sequential: no parallel burst while large blobs upload.
    // PDS is the type/size authority — upload anyway, surface rejections.
    try {
      const { data } = await a.com.atproto.repo.uploadBlob(att.file);
      uploaded.push({
        name: att.name,
        blob: {
          $type: "blob",
          ref: { $link: data.blob.ref.toString() },
          mimeType: data.blob.mimeType,
          size: data.blob.size,
        },
      });
    } catch (err) {
      failedFiles.push(
        `${att.name} (${err instanceof Error ? err.message : "rejected by server"})`,
      );
    }
  }
  if (uploaded.length === 0 && attachments.some((a) => a.file)) {
    throw new Error(`No attachments could be uploaded: ${failedFiles.join(", ")}`);
  }
  const record = {
    text,
    createdAt: new Date().toISOString(),
    ...(uploaded.length > 0 ? { attachments: uploaded } : {}),
  };
  const { data } = await a.com.atproto.repo.createRecord({
    repo: a.assertDid,
    collection: COLLECTION,
    record,
  });
  const saved: Attachment[] = uploaded
    .map(storedToAttachment)
    .filter((a): a is Attachment => a !== undefined);
  return {
    reflection: {
      id: data.uri,
      text,
      createdAt: record.createdAt,
      attachments: saved.length ? saved : undefined,
    },
    failedFiles,
  };
}

export async function updateReflection(uri: string, text: string) {
  const a = requireAgent();
  const rkey = uri.split("/").pop();
  if (!rkey) return;
  const { data: record } = await a.com.atproto.repo.getRecord({
    repo: a.assertDid,
    collection: COLLECTION,
    rkey,
  });
  await a.com.atproto.repo.putRecord({
    repo: a.assertDid,
    collection: COLLECTION,
    rkey,
    record: { ...record.value, text },
  });
}

export async function deleteReflection(uri: string) {
  const a = requireAgent();
  const rkey = uri.split("/").pop();
  if (!rkey) return;
  await a.com.atproto.repo.deleteRecord({
    repo: a.assertDid,
    collection: COLLECTION,
    rkey,
  });
}

