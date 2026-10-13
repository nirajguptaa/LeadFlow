"use client";

import { useEffect } from "react";

interface Props {
  label: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}

export default function Modal({ label, onClose, width = 480, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label} style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}
