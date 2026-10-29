import { de, en, type MsgKey } from "./messages";

// Shared by server and client code, so nothing here may import "server-only".
export type Locale = "en" | "de";
export const LOCALES: Locale[] = ["en", "de"];
export const LOCALE_COOKIE = "wb_lang";
export type { MsgKey };

const DICTS: Record<Locale, Record<MsgKey, string>> = { en, de };

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "de";
}

// First visit: follow the browser's language; after that the cookie decides.
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookie)) return cookie;
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("de") ? "de" : "en";
}

export type Params = Record<string, string | number>;
export type TFn = (key: MsgKey, params?: Params) => string;

export function translate(locale: Locale, key: MsgKey, params?: Params): string {
  const s = DICTS[locale][key] ?? en[key];
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
}

export function makeT(locale: Locale): TFn {
  return (key, params) => translate(locale, key, params);
}

// Splits a message around one placeholder so a component can put markup
// (for example bold text) there: "Also involves {cap}." -> ["Also involves ", ".")
export function splitAt(t: TFn, key: MsgKey, name: string): [string, string] {
  const mark = "\u0000";
  const [a, b = ""] = t(key, { [name]: mark }).split(mark);
  return [a, b];
}

export const dateLocale = (l: Locale) => (l === "de" ? "de-DE" : "en-GB");
