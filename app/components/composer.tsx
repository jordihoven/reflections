"use client";

import { useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import { AddFilesButton, filesToAttachments } from "./attachments";
import type { Attachment } from "./types";

const MAX_LENGTH = 1000; // subject to change, but need some cap...
const MAX_FILES = 4; // matches v1 decision, atproto PDS blob limit is the real constraint later

export function Composer({
  onPost,
}: {
  onPost: (text: string, attachments: Attachment[]) => void;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);


  const acceptFiles = async (files: File[]) => {
    const remaining = MAX_FILES - attachments.length;
    const { attachments: next, skipped } = await filesToAttachments(
      files,
      remaining,
    );
    setAttachments((prev) => [...prev, ...next].slice(0, MAX_FILES));
    if (skipped.length) setNotice(`Skipped (over 1MB): ${skipped.join(", ")}`);
    else if (!next.length || files.length > remaining)
      setNotice("Max 4 files per reflection.");
    else setNotice("");
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setNotice("");
  };

  const post = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    onPost(trimmed, attachments);
    setText("");
    setAttachments([]);
    setNotice("");
    setDragActive(false);
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (++dragDepth.current === 1) setDragActive(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        if (--dragDepth.current === 0) setDragActive(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        acceptFiles(Array.from(e.dataTransfer.files));
      }}
      className={`group flex flex-col gap-3 rounded-xl border bg-card p-2 px-3 shadow-[0px_1px_8px_rgba(0,0,0,0.06)] transition-all duration-200 ${
        dragActive
          ? "border-primary ring-2 ring-primary/50"
          : "border-border hover:border-primary hover:ring-2 hover:ring-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/50"
      }`}
    >
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
            // desktop enter = post, mobile enter = newline...
            e.preventDefault();
            post();
          }
        }}
        placeholder="What's on your mind?"
        maxLength={MAX_LENGTH}
        rows={1}
        className="w-full resize-none overflow-auto bg-transparent text-base leading-loose font-medium text-foreground placeholder:text-muted focus:outline-none [field-sizing:content]"
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {attachments.map((a) =>
            a.type.startsWith("image/") ? (
              <span key={a.id} className="group/thumb relative">
                <img
                  src={a.dataUrl}
                  alt={a.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="absolute -top-1.5 -right-1.5 flex cursor-pointer items-center justify-center rounded-full bg-inverse p-0.5 text-white opacity-80 transition-opacity hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </span>
            ) : (
              <span
                key={a.id}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-subtle py-1 pr-1 pl-2.5 text-[13px] text-foreground"
              >
                <FileText size={14} className="shrink-0 text-muted" />
                <span className="max-w-40 truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="flex cursor-pointer items-center justify-center rounded-md p-0.5 text-muted transition-colors hover:bg-hover hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </span>
            ),
          )}
        </div>
      )}

      {notice && <p className="text-[13px] text-muted">{notice}</p>}

      <div className="flex w-full items-center justify-between">
        <AddFilesButton onSelect={acceptFiles} />
        <button
          type="button"
          onClick={post}
          disabled={!text.trim() && attachments.length === 0}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1 text-[14px] font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-30"
        >
          Post
        </button>
      </div>
    </div>
  );
}
