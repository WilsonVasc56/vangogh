"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { periods } from "@/data/periods";
import type { Artwork } from "@/data/artworks";

interface Props {
  artwork: Artwork | null;
  onClose: () => void;
}

export function ArtworkModal({ artwork, onClose }: Props) {
  const periodo = artwork ? periods.find((p) => p.id === artwork.periodo) : null;

  return (
    <Dialog open={artwork !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#111830] text-amber-50 sm:max-w-3xl">
        {artwork && (
          <>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
              <Image
                src={artwork.imagem}
                alt={artwork.titulo}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain bg-black/40"
              />
            </div>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-amber-400 text-[#0b1020] hover:bg-amber-400">
                  {artwork.ano}
                </Badge>
                {periodo && (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                    {periodo.nome} · {periodo.anos}
                  </Badge>
                )}
              </div>
              <DialogTitle className="font-serif text-2xl text-amber-50">
                {artwork.titulo}
              </DialogTitle>
              <DialogDescription className="text-amber-100/50">
                {artwork.museu}
              </DialogDescription>
            </DialogHeader>
            <p className="leading-relaxed text-amber-100/80">{artwork.descricao}</p>
            <p className="text-xs text-amber-100/40">
              Texto curado a partir do artigo “{artwork.wikiTitle}” da Wikipedia (CC BY-SA).
              Imagem de domínio público via Wikimedia Commons.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
