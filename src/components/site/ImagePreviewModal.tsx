import { useEffect } from "react";
import { X } from "lucide-react";

export function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="fixed right-4 top-4 z-[60] flex size-11 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/25"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}