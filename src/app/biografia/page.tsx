import Image from "next/image";
import { Header, Footer } from "@/components/header";
import { biography } from "@/data/biography";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biografia — Museu Van Gogh",
  description: "A vida de Vincent van Gogh (1853–1890): de Zundert a Auvers-sur-Oise.",
};

export default function BiografiaPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#0b1020] pt-16">
        <section className="mx-auto max-w-3xl px-6 py-20">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-400">O artista</p>
          <h1 className="mt-3 font-serif text-4xl text-amber-50 md:text-5xl">
            {biography.titulo}
          </h1>
          <p className="mt-3 text-lg italic text-amber-100/60">{biography.subtitulo}</p>

          <div className="relative mx-auto mt-12 aspect-[3/4] max-w-md overflow-hidden rounded-xl border border-white/10">
            <Image
              src="/artworks/autorretrato-1889.jpg"
              alt="Autorretrato de Vincent van Gogh, 1889"
              fill
              sizes="(max-width: 768px) 100vw, 448px"
              className="object-cover"
              priority
            />
          </div>
          <p className="mt-2 text-center text-xs text-amber-100/40">
            Autorretrato, setembro de 1889 · Musée d&apos;Orsay, Paris
          </p>

          <div className="mt-12 space-y-6">
            {biography.paragrafos.map((p, i) => (
              <p key={i} className="leading-relaxed text-amber-100/80">
                {p}
              </p>
            ))}
          </div>

          <h2 className="mt-16 font-serif text-3xl text-amber-300">
            Linha do tempo da vida
          </h2>
          <ol className="mt-8 space-y-0 border-l border-amber-400/30">
            {biography.marcos.map((m) => (
              <li key={m.ano} className="relative pb-8 pl-8 last:pb-0">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-amber-400 bg-[#0b1020]" />
                <span className="font-serif text-xl text-amber-400">{m.ano}</span>
                <p className="mt-1 text-amber-100/70">{m.evento}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </>
  );
}
