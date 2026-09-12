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
} from "./lib/atproto";

export default function Home() {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [revealedId, setRevealedId] = useState<string | null>(null);

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
      .then((r) =>
        setReflections((prev) => prev.map((x) => (x.id === tempId ? r : x))),
      )
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
        {reflections.map((r) => (
          <ReflectionItem
            key={r.id}
            reflection={r}
            revealed={r.id === revealedId}
            onReveal={() => setRevealedId(r.id)}
            onHide={() => setRevealedId(null)}
            onDelete={remove}
          />
        ))}
        {reflections.length === 0 && (
          <p className="text-center text-muted">No reflections to show...</p>
        )}
      </ul>
    </main>
  );
}
