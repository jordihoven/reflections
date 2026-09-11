"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Composer } from "./components/composer";
import { ReflectionItem } from "./components/reflection-item";
import type { Attachment, Reflection } from "./components/types";

const STORAGE_KEY = "reflections";

function load(): Reflection[] {
  if (typeof window === "undefined") return [];
  try {
    // v0.1 localhost, will move to atproto...
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();
const empty: Reflection[] = []; // hold reflections...

export default function Home() {
  const cache = useRef<Reflection[]>(load());
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const reflections = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => cache.current,
    () => empty,
  );

  const save = (next: Reflection[]) => {
    cache.current = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      window.alert("Storage is full. Can't save any more reflections...");
    }
    listeners.forEach((cb) => cb());
  };

  const add = (value: string, attachments: Attachment[] = []) => {
    save([
      {
        id: crypto.randomUUID(),
        text: value,
        createdAt: new Date().toISOString(),
        attachments,
      },
      ...reflections,
    ]);
  };

  const remove = (id: string) => {
    save(reflections.filter((x) => x.id !== id));
  };

  return (
    <main className="mx-auto w-full max-w-xl flex flex-1 flex-col gap-6 px-4 py-8">
      <Composer onPost={add} />
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
          <p className="text-muted text-center">No reflections to show...</p>
        )}
      </ul>
    </main>
  );
}
