"use client";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo } from "react";
import { LOCALE_COOKIE, makeT, type Locale, type TFn } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

export function useT(): TFn {
  const locale = useLocale();
  return useMemo(() => makeT(locale), [locale]);
}

// Shows the other language's name; one click flips the cookie and re-renders the page.
export function LangSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useT();
  const next: Locale = locale === "de" ? "en" : "de";
  return (
    <button
      type="button"
      lang={next}
      aria-label={t("lang.switchLabel")}
      className={`rounded px-2 py-1 text-sm hover:bg-sawdust ${className}`}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    >
      {t("lang.switch")}
    </button>
  );
}
