"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { ArtworkModal } from "@/components/artwork-modal";
import { MuseumScene, type MobileInput } from "./museum-scene";
import type { Artwork } from "@/data/artworks";
import { periods, type PeriodId } from "@/data/periods";

export function MuseumExperience() {
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [locked, setLocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [interactionToken, setInteractionToken] = useState(0);
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });
  const [currentRoom, setCurrentRoom] = useState<PeriodId | null>(null);
  const mobileInput = useRef<MobileInput>({ forward: 0, strafe: 0, lookX: 0, lookY: 0 });
  const lookPointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const currentPeriod = periods.find((period) => period.id === currentRoom);

  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const updateJoystick = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width / 2;
    const dx = event.clientX - bounds.left - radius;
    const dy = event.clientY - bounds.top - radius;
    const length = Math.hypot(dx, dy);
    const factor = length > radius ? radius / length : 1;
    const x = dx * factor;
    const y = dy * factor;
    setJoystick({ x, y });
    mobileInput.current.strafe = x / radius;
    mobileInput.current.forward = -y / radius;
  };

  const resetJoystick = () => {
    setJoystick({ x: 0, y: 0 });
    mobileInput.current.strafe = 0;
    mobileInput.current.forward = 0;
  };

  return (
    <div className="fixed inset-0 bg-[#0b1020]">
      <Canvas
        camera={{ fov: 62, near: 0.1, far: 220, position: [0, 1.7, 28] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
      >
        <MuseumScene
          active={isMobile || locked}
          isMobile={isMobile}
          mobileInput={mobileInput}
          interactionToken={interactionToken}
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
      {(locked || isMobile) && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="h-2 w-2 rounded-full border border-amber-300/80 bg-amber-300/30" />
        </div>
      )}

      {/* Instruções (visíveis quando o mouse não está travado) */}
      {!locked && !selected && !isMobile && (
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

      {isMobile && !selected && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-40 z-10 flex justify-center px-5">
            <div className="rounded-lg border border-white/10 bg-[#0b1020]/80 px-4 py-2 text-center text-xs text-amber-100/75 backdrop-blur">
              Arraste à direita para olhar. Use o joystick para caminhar. Aponte a mira e toque em Interagir.
            </div>
          </div>

          {/* Joystick: caminhar */}
          <div
            className="absolute bottom-7 left-6 z-20 h-28 w-28 touch-none rounded-full border-2 border-amber-200/35 bg-[#0b1020]/45 shadow-lg backdrop-blur"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateJoystick(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) updateJoystick(event);
            }}
            onPointerUp={resetJoystick}
            onPointerCancel={resetJoystick}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/50 bg-amber-400/30"
              style={{ transform: `translate(calc(-50% + ${joystick.x}px), calc(-50% + ${joystick.y}px))` }}
            />
          </div>

          {/* Área de arraste: olhar */}
          <div
            className="absolute bottom-7 right-6 z-20 h-28 w-28 touch-none rounded-full border border-white/15 bg-[#0b1020]/35"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              lookPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
            }}
            onPointerMove={(event) => {
              const previous = lookPointer.current;
              if (!previous || previous.id !== event.pointerId) return;
              mobileInput.current.lookX += event.clientX - previous.x;
              mobileInput.current.lookY += event.clientY - previous.y;
              lookPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
            }}
            onPointerUp={() => { lookPointer.current = null; }}
            onPointerCancel={() => { lookPointer.current = null; }}
          >
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-widest text-amber-100/65">
              Olhar
            </span>
          </div>

          <button
            type="button"
            onClick={() => setInteractionToken((token) => token + 1)}
            className="absolute bottom-40 right-7 z-20 rounded-full border border-amber-200/55 bg-amber-400 px-5 py-3 text-sm font-semibold text-[#0b1020] shadow-lg active:scale-95"
          >
            Interagir
          </button>
        </>
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
