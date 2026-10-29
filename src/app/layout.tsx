import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/I18n";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: t("meta.title"), template: "%s · Werkbank" },
    description: t("meta.description"),
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg", apple: "/icon-192.png" },
    appleWebApp: { capable: true, title: "Werkbank", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1712" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getT();
  return (
    <html lang={locale}>
      <body className="min-h-dvh">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
          }}
        />
      </body>
    </html>
  );
}
