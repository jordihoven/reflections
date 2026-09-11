"use client";

import { useRef, useState } from "react";

const MAX_LENGTH = 1000; // subject to change, but need some cap...

export function Composer({ onPost }: { onPost: (text: string) => void }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // smart textarea, knows when to grow and shrink based on content...
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  };

  const post = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onPost(trimmed);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = ""; // reset composer to initial height...
  };

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-2 px-3 shadow-[0px_1px_8px_rgba(0,0,0,0.06)] transition-all duration-200 hover:border-primary hover:ring-2 hover:ring-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/50">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          grow(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            post();
          }
        }}
        placeholder="What's on your mind?"
        maxLength={MAX_LENGTH}
        rows={1}
        className="w-full resize-none overflow-auto bg-transparent text-base leading-loose font-medium text-foreground placeholder:text-muted focus:outline-none"
      />

      <div className="flex w-full items-center justify-end gap-2">
        <button
          type="button"
          onClick={post}
          disabled={!text.trim()}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1 text-[14px] font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-30"
        >
          Post
        </button>
      </div>
    </div>
  );
}
