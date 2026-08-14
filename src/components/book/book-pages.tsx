"use client";

import type { Ref } from "react";
import { ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { artworks } from "@/data/artworks";
import { periods } from "@/data/periods";
import type { Artwork } from "@/data/artworks";
import type {
  BookChapter,
  BookPage,
  BookSource,
  FlatPage,
} from "@/data/book";

/** Lookup O(1) de obra por slug para as páginas do livro. */
const obraPorSlug = new Map<string, Artwork>(artworks.map((a) => [a.slug, a]));

export interface EntradaSumario {
  rotulo: string;
  detalhe: string;
  indice: number;
}

/** Contexto passado pelo viewer para renderizar qualquer página. */
export interface PageRenderContext {
  entradasSumario: EntradaSumario[];
  onNavigate: (indice: number) => void;
  onZoom: (obra: Artwork) => void;
}

type RefDiv = { ref?: Ref<HTMLDivElement> };

/* ------------------------------------------------------------------ */
/*  Casca comum: papel envelhecido, sombra interna e textura sutil     */
/* ------------------------------------------------------------------ */

function PageShell({
  children,
  className,
  ref,
  ...rest
}: {
  children?: React.ReactNode;
  /** Classes de layout aplicadas ao contêiner flex interno (px, py, justify…). */
  className?: string;
} & RefDiv &
  React.HTMLAttributes<HTMLDivElement>) {
  // A raiz NÃO pode ser flex: o StPageFlip alterna `display` inline (block/none)
  // ao mostrar/esconder páginas, o que sobrescreveria a classe. O layout flex
  // fica no contêiner interno, sempre visível junto com a raiz.
  return (
    <div
      ref={ref}
      className={cn(
        "relative h-full w-full overflow-hidden bg-[#f2e8d0] font-book text-[#37291a]",
        "shadow-[inset_0_0_46px_rgba(96,74,40,0.20)]",
      )}
      {...rest}
    >
      {/* textura de papel em pontos quase invisíveis */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(120,90,40,0.08)_1px,transparent_1px)] [background-size:7px_7px]"
      />
      <div className={cn("relative flex h-full w-full flex-col", className)}>
        {children}
      </div>
    </div>
  );
}

/** Cabeçalho corrente das páginas de conteúdo. */
function CabecalhoPagina({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-3 text-[#8a6d3b]">
      <span className="h-px flex-1 bg-[#b89b5e]/50" />
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.28em]">
        {titulo}
      </span>
      <span className="h-px flex-1 bg-[#b89b5e]/50" />
    </div>
  );
}

/** Número de página no rodapé (numeração visível do livro). */
function FolhaRodape({ numero }: { numero: number }) {
  return (
    <div className="flex justify-center">
      <span className="text-[0.65rem] tracking-widest text-[#8a6d3b]/80">
        — {numero} —
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Capa e contracapa (páginas duras)                                  */
/* ------------------------------------------------------------------ */

function CoverPage({ ref }: RefDiv) {
  return (
    <div
      ref={ref}
      data-density="hard"
      className="relative h-full w-full overflow-hidden bg-[#1d1708] font-book text-amber-100"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,164,65,0.16),transparent_65%)]" />
      <div className="absolute inset-3 border border-amber-500/35" />
      <div className="absolute inset-4 border border-amber-500/20" />
      <div className="relative flex h-full flex-col items-center justify-between px-8 py-10 text-center">
        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-amber-400/80">
          Biografia ilustrada
        </p>
        <div className="flex flex-col items-center gap-5">
          <div className="relative h-44 w-36 overflow-hidden border-4 border-amber-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/artworks/autorretrato-1889.jpg"
              alt="Autorretrato de Vincent van Gogh, 1889"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div>
            <h1 className="font-serif text-4xl leading-tight text-amber-200">
              Vincent
              <br />
              van Gogh
            </h1>
            <p className="mt-3 text-sm italic text-amber-100/70">
              Uma vida em páginas
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-lg tracking-[0.3em] text-amber-400/90">
            1853 – 1890
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-amber-100/40">
            Museu Van Gogh · edição digital
          </span>
        </div>
      </div>
    </div>
  );
}

function BackCoverPage({ ref }: RefDiv) {
  return (
    <div
      ref={ref}
      data-density="hard"
      className="relative h-full w-full overflow-hidden bg-[#1d1708] font-book text-amber-100"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,164,65,0.12),transparent_65%)]" />
      <div className="absolute inset-3 border border-amber-500/35" />
      <div className="relative flex h-full flex-col items-center justify-center gap-6 px-10 text-center">
        <span aria-hidden className="text-3xl text-amber-400/70">
          ❦
        </span>
        <blockquote className="text-lg italic leading-relaxed text-amber-100/85">
          “A tristeza durará para sempre.”
          <footer className="mt-3 text-[0.65rem] uppercase tracking-[0.3em] not-italic text-amber-100/45">
            Últimas palavras atribuídas · 29 de julho de 1890
          </footer>
        </blockquote>
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-amber-400/70">
          Fim
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sumário interativo                                                 */
/* ------------------------------------------------------------------ */

function TocPage({
  entradas,
  onNavigate,
  ref,
}: { entradas: EntradaSumario[]; onNavigate: (i: number) => void } & RefDiv) {
  return (
    <PageShell ref={ref} className="flex flex-col px-7 py-6">
      <h2 className="text-center font-serif text-2xl text-[#5a4020]">Sumário</h2>
      <div className="mx-auto mt-1 mb-4 h-px w-16 bg-[#b89b5e]" />
      <nav aria-label="Sumário do livro" className="min-h-0 flex-1 overflow-hidden">
        <ol className="flex h-full flex-col justify-between py-1">
          {entradas.map((e) => (
            <li key={e.rotulo}>
              <button
                type="button"
                onClick={() => onNavigate(e.indice)}
                className="group flex w-full items-baseline gap-2 text-left transition-colors hover:text-[#8a5a10]"
              >
                <span className="text-[0.78rem] font-semibold leading-snug">
                  {e.rotulo}
                </span>
                <span
                  aria-hidden
                  className="mx-1 flex-1 border-b border-dotted border-[#8a6d3b]/50"
                />
                <span className="shrink-0 text-right text-[0.65rem] uppercase tracking-wider text-[#8a6d3b]">
                  {e.detalhe}
                  <span className="ml-2 text-[#5a4020]">pág. {e.indice + 1}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Abertura de capítulo                                               */
/* ------------------------------------------------------------------ */

function ChapterOpenerPage({
  capitulo,
  ref,
}: { capitulo: BookChapter } & RefDiv) {
  return (
    <PageShell className="flex flex-col" ref={ref}>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="text-[0.6rem] uppercase tracking-[0.4em] text-[#8a6d3b]">
          Capítulo {capitulo.numero}
        </span>
        <h2 className="mt-4 font-serif text-[1.7rem] leading-tight text-[#4a3418]">
          {capitulo.titulo}
        </h2>
        <div className="mt-3 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.2em] text-[#8a6d3b]">
          <span>{capitulo.anos}</span>
          <span aria-hidden>·</span>
          <span>{capitulo.local}</span>
        </div>
        <span aria-hidden className="mt-6 text-2xl text-[#b89b5e]">
          ❦
        </span>
        {capitulo.epigrafe && (
          <blockquote className="mt-6 max-w-[30ch] text-[0.95rem] italic leading-relaxed text-[#5a4020]/90">
            “{capitulo.epigrafe.texto}”
            <footer className="mt-3 text-[0.62rem] uppercase tracking-[0.18em] not-italic text-[#8a6d3b]">
              {capitulo.epigrafe.fonte}
            </footer>
          </blockquote>
        )}
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Páginas de conteúdo                                                */
/* ------------------------------------------------------------------ */

function TextPageView({
  capitulo,
  pagina,
  primeiraDoCapitulo,
  folha,
  ref,
}: {
  capitulo: BookChapter;
  pagina: Extract<BookPage, { tipo: "texto" }>;
  primeiraDoCapitulo: boolean;
  folha: number;
} & RefDiv) {
  return (
    <PageShell ref={ref} className="flex flex-col px-7 py-5">
      <CabecalhoPagina titulo={capitulo.titulo} />
      <div className="mt-5 min-h-0 flex-1 space-y-4">
        {pagina.paragrafos.map((p, i) => (
          <p
            key={i}
            className={cn(
              "text-justify text-[0.93rem] leading-[1.8] text-[#37291a]",
              primeiraDoCapitulo &&
                i === 0 &&
                "first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-[3.1em] first-letter:font-semibold first-letter:leading-[0.85] first-letter:text-[#7a5a24]",
            )}
          >
            {p}
          </p>
        ))}
      </div>
      <FolhaRodape numero={folha} />
    </PageShell>
  );
}

/** Ficha técnica estilo etiqueta de museu. */
function FichaTecnica({ obra }: { obra: Artwork }) {
  const periodo = periods.find((p) => p.id === obra.periodo);
  const dimensoes =
    obra.larguraCm && obra.alturaCm
      ? `${obra.larguraCm} × ${obra.alturaCm} cm`
      : null;
  return (
    <dl className="space-y-1 text-[0.72rem] leading-relaxed">
      <div className="flex gap-2">
        <dt className="w-16 shrink-0 uppercase tracking-wider text-[#8a6d3b]">Obra</dt>
        <dd className="font-semibold">{obra.titulo}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-16 shrink-0 uppercase tracking-wider text-[#8a6d3b]">Ano</dt>
        <dd>
          {obra.ano}
          {periodo ? ` · ${periodo.nome}` : ""}
        </dd>
      </div>
      {obra.tecnica && (
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 uppercase tracking-wider text-[#8a6d3b]">Técnica</dt>
          <dd>{obra.tecnica}</dd>
        </div>
      )}
      {dimensoes && (
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 uppercase tracking-wider text-[#8a6d3b]">Dimensões</dt>
          <dd>{dimensoes}</dd>
        </div>
      )}
      <div className="flex gap-2">
        <dt className="w-16 shrink-0 uppercase tracking-wider text-[#8a6d3b]">Local</dt>
        <dd>{obra.museu}</dd>
      </div>
    </dl>
  );
}

/** Imagem de obra moldurada, clicável para zoom. */
function ImagemObra({
  obra,
  onZoom,
  className,
}: {
  obra: Artwork;
  onZoom: (obra: Artwork) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onZoom(obra)}
      aria-label={`Ampliar a obra ${obra.titulo}`}
      className={cn(
        "group relative block w-full cursor-zoom-in overflow-hidden bg-[#14100a] p-2 shadow-[0_8px_24px_rgba(40,28,10,0.35)]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={obra.imagem}
        alt={`${obra.titulo} (${obra.ano})`}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full max-h-full w-full object-contain"
      />
      <span className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[0.6rem] uppercase tracking-wider text-amber-100 opacity-0 transition-opacity group-hover:opacity-100">
        <ZoomIn className="h-3 w-3" aria-hidden /> ampliar
      </span>
    </button>
  );
}

function ArtworkPageView({
  capitulo,
  pagina,
  folha,
  onZoom,
  ref,
}: {
  capitulo: BookChapter;
  pagina: Extract<BookPage, { tipo: "obra" }>;
  folha: number;
  onZoom: (obra: Artwork) => void;
} & RefDiv) {
  const obra = obraPorSlug.get(pagina.slug);
  if (!obra) return <PageShell ref={ref} />;
  return (
    <PageShell ref={ref} className="flex flex-col px-7 py-5">
      <CabecalhoPagina titulo={capitulo.titulo} />
      <div className="mt-4 min-h-0 flex-1">
        <ImagemObra obra={obra} onZoom={onZoom} className="h-[58%]" />
        {pagina.legenda && (
          <p className="mt-3 text-center text-[0.78rem] italic leading-snug text-[#5a4020]/85">
            {pagina.legenda}
          </p>
        )}
        <div className="mt-3 border-t border-[#b89b5e]/40 pt-3">
          <FichaTecnica obra={obra} />
        </div>
      </div>
      <FolhaRodape numero={folha} />
    </PageShell>
  );
}

function TextoObraPageView({
  capitulo,
  pagina,
  folha,
  onZoom,
  ref,
}: {
  capitulo: BookChapter;
  pagina: Extract<BookPage, { tipo: "texto-obra" }>;
  folha: number;
  onZoom: (obra: Artwork) => void;
} & RefDiv) {
  const obra = obraPorSlug.get(pagina.slug);
  return (
    <PageShell ref={ref} className="flex flex-col px-7 py-5">
      <CabecalhoPagina titulo={capitulo.titulo} />
      <div className="mt-4 min-h-0 flex-1 space-y-3">
        {obra && <ImagemObra obra={obra} onZoom={onZoom} className="h-[46%]" />}
        <div className="space-y-3">
          {pagina.paragrafos.map((p, i) => (
            <p key={i} className="text-justify text-[0.9rem] leading-[1.75]">
              {p}
            </p>
          ))}
        </div>
        {obra && (
          <p className="text-center text-[0.66rem] uppercase tracking-[0.18em] text-[#8a6d3b]">
            {obra.titulo} · {obra.ano}
          </p>
        )}
      </div>
      <FolhaRodape numero={folha} />
    </PageShell>
  );
}

function ContextoPageView({
  capitulo,
  pagina,
  folha,
  ref,
}: {
  capitulo: BookChapter;
  pagina: Extract<BookPage, { tipo: "contexto" }>;
  folha: number;
} & RefDiv) {
  return (
    <PageShell ref={ref} className="flex flex-col px-7 py-5">
      <CabecalhoPagina titulo={capitulo.titulo} />
      <div className="mt-5 flex min-h-0 flex-1 flex-col justify-center">
        <div className="border border-[#b89b5e]/60 bg-[#eaddc0]/70 px-6 py-6 shadow-[inset_0_0_24px_rgba(120,90,40,0.12)]">
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[#8a6d3b]">
            Contexto
          </p>
          <h3 className="mt-2 font-serif text-xl text-[#4a3418]">
            {pagina.titulo}
          </h3>
          <div className="mt-4 space-y-3">
            {pagina.paragrafos.map((p, i) => (
              <p key={i} className="text-justify text-[0.88rem] leading-[1.75]">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
      <FolhaRodape numero={folha} />
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Páginas finais: linha do tempo, referências, créditos              */
/* ------------------------------------------------------------------ */

function TimelinePageView({
  marcos,
  parte,
  totalPartes,
  folha,
  ref,
}: {
  marcos: { ano: string; evento: string }[];
  parte: number;
  totalPartes: number;
  folha: number;
} & RefDiv) {
  return (
    <PageShell ref={ref} className="flex flex-col px-7 py-5">
      <CabecalhoPagina
        titulo={totalPartes > 1 ? `Linha do tempo · ${parte}/${totalPartes}` : "Linha do tempo"}
      />
      <h2 className="mt-4 text-center font-serif text-xl text-[#4a3418]">
        1853 – 1973
      </h2>
      <ol className="mt-5 min-h-0 flex-1 space-y-0 border-l border-[#b89b5e]/60 pl-5">
        {marcos.map((m) => (
          <li key={m.ano} className="relative pb-3 last:pb-0">
            <span className="absolute top-[0.45em] -left-[24.5px] h-2 w-2 rounded-full border border-[#8a6d3b] bg-[#f2e8d0]" />
            <span className="font-serif text-[0.95rem] font-semibold text-[#7a5a24]">
              {m.ano}
            </span>
            <p className="text-[0.78rem] leading-snug text-[#37291a]/90">
              {m.evento}
            </p>
          </li>
        ))}
      </ol>
      <FolhaRodape numero={folha} />
    </PageShell>
  );
}

function ReferencesPageView({
  fontes,
  parte,
  totalPartes,
  folha,
  ref,
}: {
  fontes: BookSource[];
  parte: number;
  totalPartes: number;
  folha: number;
} & RefDiv) {
  return (
    <PageShell ref={ref} className="flex flex-col px-7 py-5">
      <CabecalhoPagina
        titulo={totalPartes > 1 ? `Referências · ${parte}/${totalPartes}` : "Referências"}
      />
      <h2 className="mt-4 text-center font-serif text-xl text-[#4a3418]">
        Fontes consultadas
      </h2>
      <ol className="mt-5 min-h-0 flex-1 list-decimal space-y-2.5 pl-5 text-[0.74rem] leading-relaxed">
        {fontes.map((f) => (
          <li key={f.url}>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5a4020] underline decoration-[#b89b5e]/60 underline-offset-2 transition-colors hover:text-[#8a5a10]"
            >
              {f.titulo}
            </a>
            {f.licenca && (
              <span className="text-[#8a6d3b]"> — {f.licenca}</span>
            )}
          </li>
        ))}
      </ol>
      <FolhaRodape numero={folha} />
    </PageShell>
  );
}

function CreditsPage({ ref }: RefDiv) {
  return (
    <PageShell ref={ref} className="flex flex-col items-center justify-center px-8 py-6 text-center">
      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-[#8a6d3b]">
        Colofão
      </p>
      <h2 className="mt-3 font-serif text-xl text-[#4a3418]">Créditos</h2>
      <div className="mt-5 max-w-[34ch] space-y-3 text-[0.76rem] leading-relaxed text-[#37291a]/90">
        <p>
          Livro digital do Museu Virtual Van Gogh — projeto educativo sem fins
          lucrativos.
        </p>
        <p>
          Textos curados e parafraseados a partir da Wikipedia (CC BY-SA), do
          Van Gogh Museum e da edição das cartas em vangoghletters.org. Imagens
          de domínio público via Wikimedia Commons.
        </p>
        <p>
          Navegação em livro com StPageFlip (react-pageflip). Tipografia:
          Cormorant Garamond e Playfair Display.
        </p>
      </div>
      <span aria-hidden className="mt-6 text-xl text-[#b89b5e]">
        ❦
      </span>
      <p className="mt-4 text-[0.62rem] uppercase tracking-[0.3em] text-[#8a6d3b]">
        2026
      </p>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Dispatcher: renderiza qualquer FlatPage                            */
/* ------------------------------------------------------------------ */

export function renderBookPage(
  page: FlatPage,
  folha: number,
  ctx: PageRenderContext,
  ref?: Ref<HTMLDivElement>,
) {
  switch (page.tipo) {
    case "capa":
      return <CoverPage ref={ref} />;
    case "sumario":
      return (
        <TocPage
          ref={ref}
          entradas={ctx.entradasSumario}
          onNavigate={ctx.onNavigate}
        />
      );
    case "abertura":
      return <ChapterOpenerPage ref={ref} capitulo={page.capitulo} />;
    case "conteudo": {
      const { capitulo, pagina, indiceNoCapitulo } = page;
      switch (pagina.tipo) {
        case "texto":
          return (
            <TextPageView
              ref={ref}
              capitulo={capitulo}
              pagina={pagina}
              primeiraDoCapitulo={indiceNoCapitulo === 0}
              folha={folha}
            />
          );
        case "obra":
          return (
            <ArtworkPageView
              ref={ref}
              capitulo={capitulo}
              pagina={pagina}
              folha={folha}
              onZoom={ctx.onZoom}
            />
          );
        case "texto-obra":
          return (
            <TextoObraPageView
              ref={ref}
              capitulo={capitulo}
              pagina={pagina}
              folha={folha}
              onZoom={ctx.onZoom}
            />
          );
        case "contexto":
          return (
            <ContextoPageView
              ref={ref}
              capitulo={capitulo}
              pagina={pagina}
              folha={folha}
            />
          );
      }
      break;
    }
    case "timeline":
      return (
        <TimelinePageView
          ref={ref}
          marcos={page.marcos}
          parte={page.parte}
          totalPartes={page.totalPartes}
          folha={folha}
        />
      );
    case "referencias":
      return (
        <ReferencesPageView
          ref={ref}
          fontes={page.fontes}
          parte={page.parte}
          totalPartes={page.totalPartes}
          folha={folha}
        />
      );
    case "creditos":
      return <CreditsPage ref={ref} />;
    case "contracapa":
      return <BackCoverPage ref={ref} />;
  }
  return null;
}
