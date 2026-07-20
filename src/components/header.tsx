import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#0b1020]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-serif text-lg tracking-wide text-amber-100">
          Museu <span className="italic text-amber-400">Van Gogh</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-amber-100/70">
          <Link href="/" className="transition-colors hover:text-amber-300">
            Entrada
          </Link>
          <Link href="/#timeline" className="transition-colors hover:text-amber-300">
            Acervo
          </Link>
          <Link href="/museu" className="transition-colors hover:text-amber-300">
            Museu 3D
          </Link>
          <Link href="/biografia" className="transition-colors hover:text-amber-300">
            Biografia
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0b1020] py-10">
      <div className="mx-auto max-w-6xl px-6 text-sm text-amber-100/50">
        <p>
          Museu Virtual Van Gogh — projeto educativo. Textos curados a partir da{" "}
          <a
            href="https://pt.wikipedia.org/wiki/Vincent_van_Gogh"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-amber-400/40 underline-offset-4 hover:text-amber-300"
          >
            Wikipedia
          </a>{" "}
          (CC BY-SA) e imagens de domínio público do{" "}
          <a
            href="https://commons.wikimedia.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-amber-400/40 underline-offset-4 hover:text-amber-300"
          >
            Wikimedia Commons
          </a>
          .
        </p>
        <p className="mt-2">
          Inspirado na experiência do Van Gogh Museum, Museumplein 6, Amsterdã.
        </p>
      </div>
    </footer>
  );
}
