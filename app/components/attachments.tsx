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

const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.82;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const max = Math.max(bitmap.width, bitmap.height);
  if (max <= MAX_EDGE) {
    bitmap.close();
    return file;
  }
  const scale = MAX_EDGE / max;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  return blob ? new File([blob], file.name, { type: "image/jpeg" }) : file;
}

function isCompressible(file: File): boolean {
  return (
    file.type.startsWith("image/") &&
    !/gif|svg|heic|heif/i.test(file.type)
  );
}

export async function filesToAttachments(files: File[]): Promise<Attachment[]> {
  return Promise.all(
    files.map(async (f) => {
      const file = isCompressible(f) ? await compressImage(f).catch(() => f) : f;
      const dataUrl = await readAsDataUrl(file);
      const dims = file.type.startsWith("image/")
        ? await readImageDimensions(dataUrl)
        : undefined;
      return {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        width: dims?.width,
        height: dims?.height,
        file,
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
