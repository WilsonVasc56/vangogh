"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { bookChapters, flattenBook, type FlatPage } from "@/data/book";
import type { Artwork } from "@/data/artworks";
import type { EntradaSumario, PageRenderContext } from "./book-pages";
import type { FlipApi } from "./flip-book";
import { BookProgress } from "./book-progress";
import { BookThumbnails } from "./book-thumbnails";
import { ArtworkZoom } from "./artwork-zoom";

// Ambos os modos manipulam DOM/estado local: nunca renderizam no servidor.
const FlipBook = dynamic(() => import("./flip-book"), { ssr: false });
const BookFlat = dynamic(() => import("./book-flat"), { ssr: false });

/** Lê o deep-link ?pagina=N (1-based) uma única vez, no cliente. */
function lerPaginaInicial(total: number): number {
  if (typeof window === "undefined") return 0;
  const bruto = new URLSearchParams(window.location.search).get("pagina");
  const n = bruto === null ? NaN : Number.parseInt(bruto, 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(n - 1, total - 1);
}

/** Rótulo da seção atual para a barra de progresso. */
function rotuloDaPosicao(pages: FlatPage[], atual: number): string | null {
  const p = pages[atual];
  if (p.tipo === "timeline") return "Linha do tempo";
  if (p.tipo === "referencias") return "Referências";
  if (p.tipo === "creditos") return "Créditos";
  if (p.tipo === "contracapa") return null;
  for (let i = atual; i >= 0; i--) {
    const q = pages[i];
    if (q.tipo === "abertura") {
      return `Cap. ${q.capitulo.numero} — ${q.capitulo.titulo}`;
    }
  }
  return null;
}

export default function BookViewer() {
  const pages = useMemo(() => flattenBook(bookChapters), []);
  const total = pages.length;

  const [paginaInicial] = useState(() => lerPaginaInicial(total));
  const [atual, setAtual] = useState(paginaInicial);
  // Reduced-motion via preferência do sistema; ?simples=1 força o modo simples
  // (útil para QA automatizado e como fallback manual do flip 3D).
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    if (new URLSearchParams(window.location.search).get("simples") === "1") {
      return true;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [zoomObra, setZoomObra] = useState<Artwork | null>(null);
  const [miniAbertas, setMiniAbertas] = useState(false);
  const flipApi = useRef<FlipApi | null>(null);

  // Reage se o usuário alternar a preferência de movimento durante a sessão.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const entradasSumario = useMemo(() => {
    const entradas: EntradaSumario[] = [];
    pages.forEach((p, i) => {
      if (p.tipo === "abertura") {
        entradas.push({
          rotulo: `${p.capitulo.numero}. ${p.capitulo.titulo}`,
          detalhe: p.capitulo.anos,
          indice: i,
        });
      } else if (p.tipo === "timeline" && p.parte === 1) {
        entradas.push({ rotulo: "Linha do tempo", detalhe: "1853–1973", indice: i });
      } else if (p.tipo === "referencias" && p.parte === 1) {
        entradas.push({ rotulo: "Referências", detalhe: "", indice: i });
      } else if (p.tipo === "creditos") {
        entradas.push({ rotulo: "Créditos", detalhe: "", indice: i });
      }
    });
    return entradas;
  }, [pages]);

  const irPara = useCallback(
    (n: number) => {
      const alvo = Math.max(0, Math.min(n, total - 1));
      if (flipApi.current) flipApi.current.flip(alvo);
      else setAtual(alvo);
    },
    [total],
  );

  const proxima = useCallback(() => {
    if (flipApi.current) flipApi.current.flipNext();
    else setAtual((c) => Math.min(c + 1, total - 1));
  }, [total]);

  const anterior = useCallback(() => {
    if (flipApi.current) flipApi.current.flipPrev();
    else setAtual((c) => Math.max(c - 1, 0));
  }, []);

  // Teclado: ← → Home End (suspenso enquanto o zoom está aberto).
  useEffect(() => {
    if (zoomObra) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") proxima();
      else if (e.key === "ArrowLeft") anterior();
      else if (e.key === "Home") irPara(0);
      else if (e.key === "End") irPara(total - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [proxima, anterior, irPara, total, zoomObra]);

  // Deep-link compartilhável: a URL acompanha a página corrente.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("pagina", String(atual + 1));
    window.history.replaceState(null, "", url);
  }, [atual]);

  const ctx = useMemo<PageRenderContext>(
    () => ({ entradasSumario, onNavigate: irPara, onZoom: setZoomObra }),
    [entradasSumario, irPara],
  );

  const onFlipPage = useCallback((indice: number) => setAtual(indice), []);
  const onPronto = useCallback((api: FlipApi | null) => {
    flipApi.current = api;
  }, []);

  const rotulo = rotuloDaPosicao(pages, atual);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {/* Região anunciada a leitores de tela a cada virada. */}
      <p className="sr-only" role="status">
        Página {atual + 1} de {total}
        {rotulo ? ` — ${rotulo}` : ""}
      </p>

      <div className="relative flex w-full items-center justify-center">
        <button
          type="button"
          onClick={anterior}
          disabled={atual === 0}
          aria-label="Página anterior"
          className="absolute left-1 z-10 rounded-full border border-white/15 bg-[#0b1020]/70 p-2 text-amber-100/80 backdrop-blur transition-colors hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-30 md:left-6"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>

        {reducedMotion ? (
          <BookFlat
            page={pages[atual]}
            folha={atual + 1}
            ctx={ctx}
            onProxima={proxima}
            onAnterior={anterior}
          />
        ) : (
          <FlipBook
            pages={pages}
            ctx={ctx}
            paginaInicial={paginaInicial}
            onFlipPage={onFlipPage}
            onPronto={onPronto}
          />
        )}

        <button
          type="button"
          onClick={proxima}
          disabled={atual >= total - 1}
          aria-label="Próxima página"
          className="absolute right-1 z-10 rounded-full border border-white/15 bg-[#0b1020]/70 p-2 text-amber-100/80 backdrop-blur transition-colors hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-30 md:right-6"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMiniAbertas((v) => !v)}
          aria-expanded={miniAbertas}
          className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-amber-100/70 transition-colors hover:border-amber-400/50 hover:text-amber-300"
        >
          <Images className="h-3.5 w-3.5" aria-hidden />
          Miniaturas
        </button>
        <span className="hidden text-xs text-amber-100/40 sm:inline">
          Arraste o canto da página ou use as setas ← →
        </span>
      </div>

      <BookThumbnails
        pages={pages}
        atual={atual}
        aberto={miniAbertas}
        onNavigate={irPara}
      />

      <BookProgress atual={atual} total={total} rotulo={rotulo} />

      <ArtworkZoom obra={zoomObra} onClose={() => setZoomObra(null)} />
    </div>
  );
}
