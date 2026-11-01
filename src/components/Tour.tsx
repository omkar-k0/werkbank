"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./I18n";

// A short "how this works" pop-up, shown once per person (remembered in this browser) and
// reopenable from the "How it works" link. Built on <dialog>, so Esc and focus trapping are native.

const STEPS = {
  owner: ["o1", "o2", "o3", "o4"],
  workshop: ["s1", "s2", "s3"],
} as const;

const EVENT = "wb:tour";

export function TourButton({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <button type="button" className={`text-sm text-muted hover:text-ink ${className}`} onClick={() => window.dispatchEvent(new Event(EVENT))}>
      {t("tour.open")}
    </button>
  );
}

export function TourDialog({ role }: { role: "owner" | "workshop" }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  const steps = STEPS[role];
  const storeKey = `wb_tour_v1_${role}`;
  const last = i === steps.length - 1;

  const open = useCallback(() => {
    setI(0);
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem(storeKey); } catch { /* private window: show it every time */ }
    const id = seen ? undefined : setTimeout(open, 700);
    window.addEventListener(EVENT, open);
    return () => {
      clearTimeout(id);
      window.removeEventListener(EVENT, open);
    };
  }, [open, storeKey]);

  const remember = () => {
    try { localStorage.setItem(storeKey, "1"); } catch { /* best effort */ }
  };
  const step = steps[i];
  // remember right away: the dialog's close event arrives a moment later, and a quick reload could beat it
  const finish = () => {
    remember();
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      onClose={remember}
      aria-labelledby="tour-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-card p-0 text-ink shadow-xl"
    >
      <div className="p-7">
        <p className="eyebrow">{t("tour.step", { n: i + 1, total: steps.length })}</p>
        <h2 id="tour-title" className="mt-3 text-2xl leading-snug">{t(`tour.${step}.t`)}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{t(`tour.${step}.d`)}</p>

        <div className="mt-6 flex gap-1.5" aria-hidden>
          {steps.map((s, n) => <span key={s} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-walnut" : "w-1.5 bg-line"}`} />)}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {i > 0 && <button type="button" className="btn-text" onClick={() => setI(i - 1)}>{t("tour.back")}</button>}
            {!last && <button type="button" className="text-sm text-muted hover:text-ink" onClick={finish}>{t("tour.skip")}</button>}
          </div>
          <button type="button" className="btn px-5" autoFocus onClick={() => (last ? finish() : setI(i + 1))}>
            {last ? t("tour.done") : t("tour.next")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
