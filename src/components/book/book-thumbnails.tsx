"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { FlatPage } from "@/data/book";

interface Props {
  pages: FlatPage[];
  atual: number;
  aberto: boolean;
  onNavigate: (indice: number) => void;
}

/** Rótulo curto de cada página na tira de miniaturas. */
function rotuloMiniatura(page: FlatPage): string {
  switch (page.tipo) {
    case "capa":
      return "Capa";
    case "sumario":
      return "Sumário";
    case "abertura":
      return `Cap. ${page.capitulo.numero}`;
    case "conteudo":
      return page.capitulo.numero.toString();
    case "timeline":
      return "Tempo";
    case "referencias":
      return "Fontes";
    case "creditos":
      return "Créditos";
    case "contracapa":
      return "Fim";
  }
}

/** Miniatura: imagem da obra quando a página é de obra; senão, rótulo. */
function Miniatura({ page }: { page: FlatPage }) {
  if (page.tipo === "conteudo" && page.pagina.tipo === "obra") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/artworks/${page.pagina.slug}.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <span className="px-1 text-[0.55rem] font-semibold uppercase leading-tight tracking-wide text-amber-100/80">
      {rotuloMiniatura(page)}
    </span>
  );
}

/** Drawer inferior com tira de miniaturas rolável horizontalmente. */
export function BookThumbnails({ pages, atual, aberto, onNavigate }: Props) {
  const ativoRef = useRef<HTMLButtonElement>(null);

  // Mantém a miniatura da página atual sempre visível na tira.
  useEffect(() => {
    if (aberto) {
      ativoRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }, [atual, aberto]);

  if (!aberto) return null;

  return (
    <div className="w-full max-w-4xl" role="navigation" aria-label="Miniaturas das páginas">
      <div className="flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-[#0b1020]/90 p-2">
        {pages.map((page, i) => (
          <button
            key={i}
            ref={i === atual ? ativoRef : undefined}
            type="button"
            onClick={() => onNavigate(i)}
            aria-label={`Ir para a página ${i + 1}: ${rotuloMiniatura(page)}`}
            aria-current={i === atual ? "page" : undefined}
            className={cn(
              "flex h-16 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm border transition-all",
              i === atual
                ? "border-amber-400 ring-1 ring-amber-400/60"
                : "border-white/15 bg-[#1a2340] hover:border-amber-400/50",
            )}
          >
            <Miniatura page={page} />
          </button>
        ))}
      </div>
    </div>
  );
}
