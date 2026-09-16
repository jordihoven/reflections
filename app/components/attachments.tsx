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

function readImageDimensions(src: string): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(undefined);
    img.src = src;
  });
}

export async function filesToAttachments(files: File[]): Promise<Attachment[]> {
  return Promise.all(
    files.map(async (f) => {
      const dataUrl = await readAsDataUrl(f);
      const dims = f.type.startsWith("image/")
        ? await readImageDimensions(dataUrl)
        : undefined;
      return {
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type,
        size: f.size,
        width: dims?.width,
        height: dims?.height,
        file: f,
        dataUrl,
      };
    }),
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
