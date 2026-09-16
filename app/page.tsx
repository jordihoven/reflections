"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LogOut } from "lucide-react";
import { Composer } from "./components/composer";
import { ReflectionItem } from "./components/reflection-item";
import { Login } from "./components/login";
import type { Attachment, Reflection } from "./components/types";
import {
  createReflection,
  deleteReflection,
  getAuthState,
  initSession,
  listReflections,
  signOut,
  subscribeAuth,
  updateReflection,
} from "./lib/atproto";

type GroupedEntry =
  | { type: "header"; label: string; dateKey: string }
  | { type: "item"; reflection: Reflection };

function formatDayLabel(createdAt: string): string {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const post = new Date(createdAt);
  const postUtc = new Date(
    Date.UTC(post.getUTCFullYear(), post.getUTCMonth(), post.getUTCDate()),
  );
  const diffDays = Math.round(
    (todayUtc.getTime() - postUtc.getTime()) / 86_400_000,
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  const dayFmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  });
  if (diffDays < 7) return dayFmt.format(postUtc);

  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const formatted = dateFmt.format(postUtc);

  return post.getUTCFullYear() === todayUtc.getUTCFullYear()
    ? formatted
    : `${formatted} ${post.getUTCFullYear()}`;
}

function groupByDate(reflections: Reflection[]): GroupedEntry[] {
  const entries: GroupedEntry[] = [];
  let lastKey = "";
  for (const r of reflections) {
    const d = new Date(r.createdAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    if (key !== lastKey) {
      entries.push({
        type: "header",
        label: formatDayLabel(r.createdAt),
        dateKey: key,
      });
      lastKey = key;
    }
    entries.push({ type: "item", reflection: r });
  }
  return entries;
}

export default function Home() {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    void initSession();
  }, []);

  useEffect(() => {
    if (auth.status !== "signedIn") return;
    void listReflections()
      .then(setReflections)
      .catch(() => setReflections([]));
  }, [auth.status]);

  const add = (text: string, attachments: Attachment[]) => {
    // optimistic: render from composer data (dataUrl) immediately, swap in the
    // persisted PDS-backed record once blob upload + record write finish
    const tempId = `tmp-${crypto.randomUUID()}`;
    const temp: Reflection = {
      id: tempId,
      text,
      createdAt: new Date().toISOString(),
      attachments: attachments.map((a) => ({ ...a })),
    };
    setReflections((prev) => [temp, ...prev]);
    createReflection(text, attachments)
      .then(({ reflection, failedFiles }) => {
        setReflections((prev) =>
          prev.map((x) => (x.id === tempId ? reflection : x)),
        );
        if (failedFiles.length)
          window.alert(`PDS rejected and skipped: ${failedFiles.join(", ")}`);
      })
      .catch((e) => {
        setReflections((prev) => prev.filter((x) => x.id !== tempId));
        window.alert(
          `Couldn't save this reflection. ${
            e instanceof Error && e.message ? e.message : "Try again."
          }`,
        );
      });
  };

  const remove = async (id: string) => {
    try {
      await deleteReflection(id);
      setReflections((prev) => prev.filter((x) => x.id !== id));
    } catch {
      window.alert("Couldn't delete this reflection. Try again.");
    }
  };

  const update = async (id: string, text: string) => {
    try {
      await updateReflection(id, text);
      setReflections((prev) =>
        prev.map((x) => (x.id === id ? { ...x, text } : x)),
      );
      setEditingId(null);
    } catch {
      window.alert("Couldn't update this reflection. Try again.");
    }
  };

  if (auth.status === "loading") {
    return (
      <main className="mx-auto w-full flex max-w-xl flex-1 flex-col gap-6 px-4 py-8" />
    );
  }

  if (auth.status === "signedOut") {
    return (
      <main className="mx-auto w-full flex max-w-xl flex-1 flex-col gap-6 px-4 py-8">
        <Login />
      </main>
    );
  }

  const grouped = groupByDate(reflections);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Sign out"
          title="Logout"
          className="flex cursor-pointer items-center rounded-xl px-3 py-2 text-muted transition-all duration-200 hover:bg-hover hover:text-foreground"
        >
          <LogOut size={16} />
        </button>
      </div>
      <Composer onPost={(text, attachments) => void add(text, attachments)} />
      <ul className="flex flex-col gap-3">
        {grouped.map((entry) =>
          entry.type === "header" ? (
            <li
              key={entry.dateKey}
              className="pt-2 text-[13px] font-medium tracking-wide text-muted"
            >
              {entry.label}
            </li>
          ) : entry.reflection.id === editingId ? (
            <Composer
              key={entry.reflection.id}
              initialText={entry.reflection.text}
              label="Save"
              onCancel={() => setEditingId(null)}
              onPost={(text) => void update(entry.reflection.id, text)}
            />
          ) : (
            <ReflectionItem
              key={entry.reflection.id}
              reflection={entry.reflection}
              revealed={entry.reflection.id === revealedId}
              onReveal={() => setRevealedId(entry.reflection.id)}
              onHide={() => setRevealedId(null)}
              onEdit={(id) => setEditingId(id)}
              onDelete={remove}
            />
          ),
        )}
        {reflections.length === 0 && (
          <p className="text-center text-muted">No reflections to show...</p>
        )}
      </ul>
    </main>
  );
}
