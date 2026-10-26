"use client";
import { useState } from "react";

export function DemoButton({ as, label, className = "btn" }: { as?: string; label: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/demo${as ? `?as=${as}` : ""}`, { method: "POST" });
        window.location.href = "/app";
      }}
    >
      {busy ? "Opening…" : label}
    </button>
  );
}
