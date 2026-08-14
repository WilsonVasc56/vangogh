"use client";

interface Props {
  /** Índice 0-based da página atual. */
  atual: number;
  total: number;
  /** Rótulo do capítulo/seção atual (ex.: "Cap. 6 — Arles — O Ateliê do Sul"). */
  rotulo: string | null;
}

/** Barra fina de progresso + indicação textual da posição no livro. */
export function BookProgress({ atual, total, rotulo }: Props) {
  const pct = total > 1 ? (atual / (total - 1)) * 100 : 100;
  return (
    <div className="w-full max-w-3xl" aria-hidden>
      <div className="flex items-baseline justify-between gap-4 text-xs text-amber-100/60">
        <span className="truncate font-serif italic">
          {rotulo ?? "Vincent van Gogh — Uma vida em páginas"}
        </span>
        <span className="shrink-0 tabular-nums">
          Página {atual + 1} de {total}
        </span>
      </div>
      <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
