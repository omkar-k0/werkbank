import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, makeT, pickLocale, type Locale, type TFn } from "./index";

export async function getLocale(): Promise<Locale> {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  return pickLocale(jar.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
}

// Server components: const { t, locale } = await getT();
export async function getT(): Promise<{ t: TFn; locale: Locale }> {
  const locale = await getLocale();
  return { t: makeT(locale), locale };
}

// For `generateMetadata`: a page title in the visitor's language.
export async function titleOf(key: Parameters<TFn>[0]) {
  const { t } = await getT();
  return { title: t(key) };
}
