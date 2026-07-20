"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  const scrollToTimeline = () => {
    document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1020]">
      {/* Fundo: Noite Estrelada desfocada */}
      <div className="absolute inset-0">
        <Image
          src="/artworks/a-noite-estrelada.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1020]/70 via-[#0b1020]/40 to-[#0b1020]" />
      </div>

      {/* Estrutura de vidro estilizada, evocando a entrada do museu */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-amber-400/10 to-transparent" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-4 text-sm uppercase tracking-[0.35em] text-amber-400"
        >
          Museumplein · Amsterdã
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="font-serif text-5xl leading-tight text-amber-50 md:text-7xl"
        >
          Museu <span className="italic text-amber-300">Van Gogh</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-amber-100/70 md:text-xl"
        >
          Uma jornada imersiva pela vida e pela obra de Vincent van Gogh —
          de Nuenen a Auvers-sur-Oise, tela a tela, em uma linha do tempo viva.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button
            size="lg"
            onClick={scrollToTimeline}
            className="bg-amber-400 px-8 text-base font-semibold text-[#0b1020] hover:bg-amber-300"
          >
            Ver linha do tempo
          </Button>
          <Link
            href="/museu"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300/50 bg-[#0b1020]/45 px-8 text-base font-medium text-amber-100 transition-colors hover:border-amber-300 hover:bg-amber-300/10 hover:text-amber-50"
          >
            Explorar em 3D
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-16 flex items-center justify-center gap-8 text-xs uppercase tracking-widest text-amber-100/40"
        >
          <span>50 obras</span>
          <span className="h-px w-8 bg-amber-400/40" />
          <span>5 períodos</span>
          <span className="h-px w-8 bg-amber-400/40" />
          <span>10 anos de gênio</span>
        </motion.div>
      </div>

      {/* Indicador de scroll */}
      <motion.button
        onClick={scrollToTimeline}
        aria-label="Rolar para o acervo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{
          opacity: { delay: 1.2, duration: 1 },
          y: { repeat: Infinity, duration: 1.8, ease: "easeInOut" },
        }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-amber-300/70"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
    </section>
  );
}
