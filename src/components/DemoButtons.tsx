"use client";
import { useState } from "react";
import { useT } from "./I18n";

export function DemoButton({ as, label, className = "btn" }: { as?: string; label: string; className?: string }) {
  const t = useT();
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
      {busy ? t("common.opening") : label}
    </button>
  );
}
