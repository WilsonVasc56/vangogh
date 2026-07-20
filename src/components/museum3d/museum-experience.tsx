"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { ArtworkModal } from "@/components/artwork-modal";
import { MuseumScene } from "./museum-scene";
import type { Artwork } from "@/data/artworks";
import { periods, type PeriodId } from "@/data/periods";

export function MuseumExperience() {
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [locked, setLocked] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<PeriodId | null>(null);
  const currentPeriod = periods.find((period) => period.id === currentRoom);

  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0b1020]">
      <Canvas
        camera={{ fov: 62, near: 0.1, far: 220, position: [0, 1.7, 28] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
      >
        <MuseumScene
          active={locked}
          onArtworkSelect={(artwork) => {
            document.exitPointerLock?.();
            setSelected(artwork);
          }}
          onPointerLockChange={setLocked}
          onRoomChange={setCurrentRoom}
        />
      </Canvas>

      {/* Identificação da sala atual */}
      {currentPeriod && (
        <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-lg border border-amber-300/25 bg-[#0b1020]/80 px-5 py-2 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300/70">
            Sala atual
          </p>
          <p className="font-serif text-lg text-amber-100">
            {currentPeriod.nome} · {currentPeriod.anos}
          </p>
        </div>
      )}

      {/* Crosshair */}
      {locked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="h-2 w-2 rounded-full border border-amber-300/80 bg-amber-300/30" />
        </div>
      )}

      {/* Instruções (visíveis quando o mouse não está travado) */}
      {!locked && !selected && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex justify-center px-6">
          <div className="pointer-events-none max-w-xl rounded-xl border border-white/10 bg-[#0b1020]/85 px-6 py-4 text-center backdrop-blur">
            <p className="font-serif text-lg text-amber-300">
              Bem-vindo ao Museu Van Gogh 3D
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/70">
              <strong className="text-amber-200">Clique na porta de vidro</strong> para abri-la ·{" "}
              <strong className="text-amber-200">Setas / WASD</strong> para andar ·{" "}
              mova o <strong className="text-amber-200">mouse</strong> para olhar ·
              as portas entre as salas abrem automaticamente ·{" "}
              <strong className="text-amber-200">clique num quadro</strong> para ver a
              história · <strong className="text-amber-200">ESC</strong> para soltar o
              cursor
            </p>
          </div>
        </div>
      )}

      {/* Voltar */}
      <div className="absolute left-4 top-4 z-10">
        <Link
          href="/"
          className="rounded-lg border border-white/10 bg-[#0b1020]/80 px-4 py-2 text-sm text-amber-100/80 backdrop-blur transition-colors hover:text-amber-300"
        >
          ← Voltar ao site
        </Link>
      </div>

      <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
