"use client";

import { cloneElement, useCallback, useEffect, useMemo, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import type { FlatPage } from "@/data/book";
import { renderBookPage, type PageRenderContext } from "./book-pages";
/** Assinatura mínima da API do StPageFlip usada pelo viewer. */
export interface FlipApi {
  flip: (pagina: number) => void;
  flipNext: () => void;
  flipPrev: () => void;
}

interface Props {
  pages: FlatPage[];
  ctx: PageRenderContext;
  paginaInicial: number;
  onFlipPage: (indice: number) => void;
  /** Chamado quando o motor termina de inicializar (null ao desmontar). */
  onPronto: (api: FlipApi | null) => void;
}

/**
 * Encapsula o StPageFlip (via react-pageflip). Os filhos são memoizados e o
 * wrapper usa renderOnlyPageLengthChange para que re-renders do viewer nunca
 * reinicializem as páginas do livro.
 */
export default function FlipBook({
  pages,
  ctx,
  paginaInicial,
  onFlipPage,
  onPronto,
}: Props) {
  const bookRef = useRef<{ pageFlip: () => FlipApi } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Identidade estável dos filhos: obrigatória para o react-pageflip.
  const children = useMemo(
    () =>
      pages.map((p, i) =>
        cloneElement(renderBookPage(p, i + 1, ctx)!, { key: i }),
      ),
    [pages, ctx],
  );

  const onFlip = useCallback(
    (e: { data: number }) => onFlipPage(e.data),
    [onFlipPage],
  );
  const onInit = useCallback(() => {
    onPronto(bookRef.current?.pageFlip() ?? null);

    // No modo retrato, o StPageFlip cria uma cópia temporária da página atual
    // para simular o verso da folha durante a dobra (newTemporaryCopy). Sem
    // intervenção, esse verso exibe o MESMO conteúdo da frente — a imagem
    // aparece duplicada "deslizando" para baixo. Escondemos o conteúdo da
    // cópia: o verso vira papel em branco, como num livro de folhas
    // impressas de um lado só.
    const bloco = wrapperRef.current?.querySelector(".stf__block");
    if (!bloco) return;
    const originais = new Set(bloco.querySelectorAll(".stf__item"));
    const observer = new MutationObserver((mutacoes) => {
      for (const mutacao of mutacoes) {
        for (const no of mutacao.addedNodes) {
          if (
            no instanceof HTMLElement &&
            no.classList.contains("stf__item") &&
            !originais.has(no)
          ) {
            for (const filho of Array.from(no.children)) {
              (filho as HTMLElement).style.visibility = "hidden";
            }
          }
        }
      }
    });
    observer.observe(bloco, { childList: true });
  }, [onPronto]);

  useEffect(() => () => onPronto(null), [onPronto]);

  return (
    <div
      ref={wrapperRef}
      className="h-[min(72vh,700px)] w-full max-w-[1050px]"
    >
      <HTMLFlipBook
        ref={bookRef}
        width={500}
        height={680}
        size="stretch"
        minWidth={290}
        maxWidth={500}
        minHeight={395}
        maxHeight={680}
        maxShadowOpacity={0.5}
        showCover={true}
        drawShadow={true}
        mobileScrollSupport={true}
        usePortrait={true}
        startPage={paginaInicial}
        flippingTime={650}
        startZIndex={0}
        autoSize={true}
        clickEventForward={true}
        useMouseEvents={true}
        swipeDistance={30}
        showPageCorners={true}
        disableFlipByClick={true}
        renderOnlyPageLengthChange={true}
        className="mx-auto"
        style={{}}
        onFlip={onFlip}
        onInit={onInit}
      >
        {children}
      </HTMLFlipBook>
    </div>
  );
}
