import { Agent } from "@atproto/api";
import {
  AtprotoDohHandleResolver,
  BrowserOAuthClient,
  type OAuthSession,
} from "@atproto/oauth-client-browser";
import type { Reflection } from "../components/types";

export const COLLECTION = "app.reflections.reflection";
export const SCOPE = `atproto repo:${COLLECTION}`;

const CLIENT_ID = "https://reflections-gules.vercel.app/client-metadata.json";
const REFLECTION_LIMIT = 100;

const handleResolver = new AtprotoDohHandleResolver({
  dohEndpoint: "https://cloudflare-dns.com/dns-query",
});

let client: BrowserOAuthClient | null = null;
let agent: Agent | null = null;
let session: OAuthSession | null = null;

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
  setAuthState({ status: "signedOut" });
}

function requireAgent(): Agent {
  if (!agent) throw new Error("Not signed in");
  return agent;
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
      const v = value as { text?: string; createdAt: string };
      return { id: uri, text: v.text ?? "", createdAt: v.createdAt };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReflection(text: string): Promise<Reflection> {
  const a = requireAgent();
  const record = { text, createdAt: new Date().toISOString() };
  // ponytail: attachments dropped until blob:*/* scope + blob upload land (step 8). Reintroduce with the rest of the blob work, not before.
  const { data } = await a.com.atproto.repo.createRecord({
    repo: a.assertDid,
    collection: COLLECTION,
    record,
  });
  return { id: data.uri, text, createdAt: record.createdAt };
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

