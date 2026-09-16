"use client";

import { useState } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { linkify } from "./linkify";
import type { Attachment, Reflection } from "./types";

function AttachmentImage({ a }: { a: Attachment }) {
  const [loaded, setLoaded] = useState(() => !a.url);
  return (
    <div className="relative w-full">
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse rounded-lg bg-subtle"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={a.dataUrl ?? a.url}
        alt={a.name}
        width={a.width}
        height={a.height}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`max-h-48 w-full rounded-lg object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export function ReflectionItem({
  reflection,
  revealed,
  onReveal,
  onHide,
  onEdit,
  onDelete,
}: {
  reflection: Reflection;
  revealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  onEdit: (id: string) => void;
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
      className={`cursor-pointer flex flex-col gap-2 rounded-xl border p-3 transition-all duration-400 ${
        revealed
          ? "border-border bg-card blur-none opacity-100 shadow-[0px_2px_12px_rgba(0,0,0,0.08)]"
          : "border-transparent blur-[2px] opacity-50"
      }`}
    >
      {reflection.text && (
        <p
          className={`w-full overflow-wrap-break-word whitespace-pre-wrap text-base leading-[1.7] font-medium transition-colors duration-400 ${
            revealed ? "text-foreground" : "text-muted"
          }`}
        >
          {linkify(reflection.text)}
        </p>
      )}
      {reflection.attachments && reflection.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reflection.attachments.map((a) =>
            a.type.startsWith("video/") && (a.dataUrl ?? a.url) ? (
              <video
                key={a.id}
                src={a.dataUrl ?? a.url}
                controls
                className="max-h-48 w-full rounded-lg"
              />
            ) : a.type.startsWith("image/") && (a.dataUrl ?? a.url) ? (
              <AttachmentImage key={a.id} a={a} />
            ) : a.url ? (
              <a
                key={a.id}
                href={a.url}
                download={a.name}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-subtle px-2.5 py-1 text-[13px] text-muted"
              >
                <FileText size={14} className="shrink-0" />
                <span className="max-w-48 truncate">{a.name}</span>
              </a>
            ) : null,
          )}
        </div>
      )}
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
            onClick={() => onEdit(reflection.id)}
            aria-label="Edit reflection"
            className="flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-[14px] text-muted transition-all duration-200 hover:bg-hover hover:text-foreground"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this reflection?"))
                onDelete(reflection.id);
            }}
            aria-label="Delete reflection"
            className="flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-[14px] text-muted transition-all duration-200 hover:bg-hover hover:text-foreground"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}
