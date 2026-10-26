import Link from "next/link";
import { Logo } from "./ui";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
      <Link href="/"><Logo className="text-walnut" /></Link>
      <nav className="flex items-center gap-1 text-sm sm:gap-4">
        <Link href="/pricing" className="rounded px-2 py-1 hover:bg-sawdust">Pricing</Link>
        <Link href="/login" className="rounded px-2 py-1 hover:bg-sawdust">Sign in</Link>
        <Link href="/signup" className="btn hidden sm:inline-flex">Start free trial</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
      <div className="flex flex-col justify-between gap-2 border-t border-line pt-6 sm:flex-row">
        <span>Werkbank. A portfolio project by Omkar Khadilkar.</span>
        <span>
          <a className="underline" href="https://github.com/omkar-k0/werkbank">Source & evaluation on GitHub</a>
        </span>
      </div>
    </footer>
  );
}
