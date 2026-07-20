"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { Artwork } from "@/data/artworks";

interface Props {
  artwork: Artwork;
  onSelect: (artwork: Artwork) => void;
}

export function ArtworkCard({ artwork, onSelect }: Props) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      onClick={() => onSelect(artwork)}
      className="group relative block w-full overflow-hidden rounded-xl border border-white/10 bg-[#111830] text-left shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:border-amber-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={artwork.imagem}
          alt={artwork.titulo}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020]/90 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <Badge className="bg-amber-400/90 text-[#0b1020] hover:bg-amber-400">
            {artwork.ano}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-lg leading-snug text-amber-50 group-hover:text-amber-300">
          {artwork.titulo}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-amber-100/50">
          {artwork.museu}
        </p>
      </div>
    </motion.button>
  );
}
