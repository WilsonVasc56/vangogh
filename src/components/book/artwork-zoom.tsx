"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { periods } from "@/data/periods";
import type { Artwork } from "@/data/artworks";

interface Props {
  obra: Artwork | null;
  onClose: () => void;
}

const ESCALA_MIN = 1;
const ESCALA_MAX = 4;

/**
 * Modal de zoom de obra com pan (arrastar) e zoom (roda do mouse, botões e
 * duplo clique). Adaptado do padrão do artwork-modal do museu.
 */
export function ArtworkZoom({ obra, onClose }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // Toda obra nova reabre sem zoom.
  useEffect(() => {
    setEscala(1);
    setPos({ x: 0, y: 0 });
  }, [obra?.slug]);

  const aplicarEscala = useCallback((proxima: number) => {
    setEscala((atual) => {
      const alvo = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, proxima));
      if (alvo === ESCALA_MIN) setPos({ x: 0, y: 0 });
      return alvo;
    });
  }, []);

  // Zoom com a roda do mouse (listener nativo para permitir preventDefault).
  useEffect(() => {
    const area = areaRef.current;
    if (!area || !obra) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      aplicarEscala(escala * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, [obra, escala, aplicarEscala]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (escala === ESCALA_MIN) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrasto.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    setPos({ x: a.x + (e.clientX - a.px), y: a.y + (e.clientY - a.py) });
  };
  const encerrarArrasto = () => {
    arrasto.current = null;
  };

  const periodo = obra ? periods.find((p) => p.id === obra.periodo) : null;
  const dimensoes =
    obra?.larguraCm && obra?.alturaCm
      ? `${obra.larguraCm} × ${obra.alturaCm} cm`
      : null;

  return (
    <Dialog open={obra !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#111830] text-amber-50 sm:max-w-4xl">
        {obra && (
          <>
            <div
              ref={areaRef}
              className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-lg bg-black/50"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={encerrarArrasto}
              onPointerCancel={encerrarArrasto}
              onDoubleClick={() =>
                aplicarEscala(escala === ESCALA_MIN ? 2.5 : ESCALA_MIN)
              }
              role="application"
              aria-label={`Zoom da obra ${obra.titulo}. Use a roda do mouse ou os botões para ampliar; arraste para mover.`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={obra.imagem}
                alt={obra.titulo}
                draggable={false}
                className="h-full w-full object-contain transition-transform duration-75 will-change-transform"
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})`,
                  cursor: escala > ESCALA_MIN ? "grab" : "zoom-in",
                }}
              />
              <div className="absolute right-3 top-3 flex gap-1">
                <button
                  type="button"
                  aria-label="Aproximar"
                  onClick={() => aplicarEscala(escala * 1.4)}
                  className="rounded-full bg-black/60 p-2 text-amber-100 transition-colors hover:bg-black/80"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Afastar"
                  onClick={() => aplicarEscala(escala / 1.4)}
                  className="rounded-full bg-black/60 p-2 text-amber-100 transition-colors hover:bg-black/80"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Redefinir zoom"
                  onClick={() => {
                    setEscala(1);
                    setPos({ x: 0, y: 0 });
                  }}
                  className="rounded-full bg-black/60 p-2 text-amber-100 transition-colors hover:bg-black/80"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-amber-400 text-[#0b1020] hover:bg-amber-400">
                  {obra.ano}
                </Badge>
                {periodo && (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                    {periodo.nome} · {periodo.anos}
                  </Badge>
                )}
                {obra.tecnica && (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                    {obra.tecnica}
                  </Badge>
                )}
                {dimensoes && (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                    {dimensoes}
                  </Badge>
                )}
              </div>
              <DialogTitle className="font-serif text-2xl text-amber-50">
                {obra.titulo}
              </DialogTitle>
              <DialogDescription className="text-amber-100/50">
                {obra.museu}
              </DialogDescription>
            </DialogHeader>
            <p className="leading-relaxed text-amber-100/80">{obra.descricao}</p>
            <p className="text-xs text-amber-100/40">
              Imagem de domínio público via Wikimedia Commons. Duplo clique
              alterna o zoom; com zoom ativo, arraste para explorar a tela.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
