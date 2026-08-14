"use client";

import dynamic from "next/dynamic";

// O viewer (StPageFlip / reduced-motion) manipula o DOM: nunca vai para o SSR.
const BookViewer = dynamic(() => import("./book-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="font-serif text-lg italic text-amber-100/50">
        Abrindo o livro…
      </p>
    </div>
  ),
});

export function BookExperience() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-10">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-400">
          Livro digital
        </p>
        <h1 className="mt-2 font-serif text-3xl text-amber-50 md:text-4xl">
          Vincent van Gogh — Uma Vida em Páginas
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-amber-100/60">
          Uma biografia ilustrada em dez capítulos: folheie, explore as obras em
          detalhe e navegue pelo sumário, pelas miniaturas ou pelo teclado.
        </p>
      </header>
      <BookViewer />
    </section>
  );
}
