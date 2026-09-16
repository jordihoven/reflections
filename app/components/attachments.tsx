"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import type { Attachment } from "./types";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function filesToAttachments(files: File[]): Promise<Attachment[]> {
  return Promise.all(
    files.map(async (f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.type,
      size: f.size,
      file: f,
      dataUrl: await readAsDataUrl(f),
    })),
  );
}

export function AddFilesButton({
  onSelect,
}: {
  onSelect: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Add files"
        title="Add files"
        className="flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-[14px] text-muted transition-all duration-200 hover:bg-hover hover:text-foreground"
      >
        <ImagePlus size={16} />
      </button>
      <input
        ref={inputRef}
        id="composer-files"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          onSelect(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </>
  );
}
