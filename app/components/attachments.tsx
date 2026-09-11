"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import type { Attachment } from "./types";

// ~1MB/file so 4 files stay under the ~5MB localStorage quota. atproto blobs replace this cap.
export const MAX_FILE_SIZE = 1_000_000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function filesToAttachments(
  files: File[],
  remaining: number,
): Promise<{ attachments: Attachment[]; skipped: string[] }> {
  const skipped = files
    .filter((f) => f.size > MAX_FILE_SIZE)
    .map((f) => f.name);
  const attachments = await Promise.all(
    files
      .filter((f) => f.size <= MAX_FILE_SIZE)
      .slice(0, remaining)
      .map(async (f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type,
        size: f.size,
        dataUrl: await readAsDataUrl(f),
      })),
  );
  return { attachments, skipped };
}

export function AddFilesButton({ onSelect }: { onSelect: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Add files"
        title="Add files"
        className="flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-[14px] text-muted transition-all duration-200 hover:bg-[#F6F6F6] hover:text-foreground"
      >
        <ImagePlus size={16} />
      </button>
      <input
        ref={inputRef}
        id="composer-files"
        type="file"
        multiple
        accept="image/*,audio/*,text/plain,text/markdown,text/md"
        className="hidden"
        onChange={(e) => {
          onSelect(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </>
  );
}
