"use client";

import { Trash2 } from "lucide-react";
import type { Reflection } from "./types";

export function ReflectionItem({
  reflection,
  revealed,
  onReveal,
  onHide,
  onDelete,
}: {
  reflection: Reflection;
  revealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li
      onMouseEnter={onReveal}
      onMouseLeave={onHide}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        if (revealed) onHide();
        else onReveal();
      }}
      className={`flex flex-col gap-2 rounded-xl border p-3 transition-all duration-400 ${
        revealed
          ? "border-zinc-200 bg-white blur-none opacity-100 shadow-[0px_2px_12px_rgba(0,0,0,0.08)]"
          : "border-transparent blur-[2px] opacity-50"
      }`}
    >
      <p
        className={`w-full overflow-wrap-break-word whitespace-pre-wrap text-base leading-[1.7] transition-colors duration-400 ${
          revealed ? "text-foreground" : "text-muted"
        }`}
      >
        {reflection.text}
      </p>
      <div className="flex w-full items-center justify-between">
        <time className="flex items-center whitespace-nowrap text-[14px] text-muted">
          {new Date(reflection.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        <div
          className={`flex gap-2 transition-opacity duration-200 ${
            revealed ? "opacity-100" : "opacity-25"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm("Delete this reflection? This cannot be undone.")
              )
                onDelete(reflection.id);
            }}
            aria-label="Delete reflection"
            className="flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-[14px] text-muted transition-all duration-200 hover:bg-[#F6F6F6] hover:text-foreground"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}
