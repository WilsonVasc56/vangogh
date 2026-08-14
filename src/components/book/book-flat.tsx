"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FlatPage } from "@/data/book";
import { renderBookPage, type PageRenderContext } from "./book-pages";

interface Props {
  page: FlatPage;
  /** Número visível da folha (índice + 1), usado como chave da transição. */
  folha: number;
  ctx: PageRenderContext;
  onProxima: () => void;
  onAnterior: () => void;
}

/**
 * Alternativa ao flip 3D para quem prefere reduced-motion: uma página por vez
 * com transição de fade e suporte a swipe. Toda a navegação (botões, teclado,
 * sumário, miniaturas) continua funcionando pelo viewer.
 */
export default function BookFlat({
  page,
  folha,
  ctx,
  onProxima,
  onAnterior,
}: Props) {
  const toque = useRef<number | null>(null);

  return (
    <div
      className="h-[min(72vh,700px)] w-full max-w-[min(92vw,500px)]"
      onTouchStart={(e) => {
        toque.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (toque.current === null) return;
        const delta = e.changedTouches[0].clientX - toque.current;
        toque.current = null;
        if (delta <= -50) onProxima();
        else if (delta >= 50) onAnterior();
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={folha}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="h-full w-full overflow-hidden rounded-sm shadow-2xl"
        >
          {renderBookPage(page, folha, ctx)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
