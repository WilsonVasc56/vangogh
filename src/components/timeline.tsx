"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ArtworkCard } from "@/components/artwork-card";
import { ArtworkModal } from "@/components/artwork-modal";
import { artworks, type Artwork } from "@/data/artworks";
import { periods, type PeriodId } from "@/data/periods";

type Filter = PeriodId | "todos";

export function Timeline() {
  const [filter, setFilter] = useState<Filter>("todos");
  const [selected, setSelected] = useState<Artwork | null>(null);

  const visible = filter === "todos" ? artworks : artworks.filter((a) => a.periodo === filter);
  const grouped = periods
    .filter((p) => filter === "todos" || p.id === filter)
    .map((p) => ({ period: p, items: visible.filter((a) => a.periodo === p.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <section id="timeline" className="bg-[#0b1020] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="text-sm uppercase tracking-[0.35em] text-amber-400">O acervo</p>
          <h2 className="mt-3 font-serif text-4xl text-amber-50 md:text-5xl">
            Uma década em <span className="italic text-amber-300">telas</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-amber-100/60">
            Percorra os cinco períodos da curta e intensa carreira de Van Gogh.
            Toque em uma obra para conhecer sua história.
          </p>
        </motion.div>

        {/* Filtro por período */}
        <div className="mb-16 flex flex-wrap justify-center gap-3">
          <button onClick={() => setFilter("todos")}>
            <Badge
              variant={filter === "todos" ? "default" : "outline"}
              className={
                filter === "todos"
                  ? "cursor-pointer bg-amber-400 px-4 py-1.5 text-sm text-[#0b1020] hover:bg-amber-300"
                  : "cursor-pointer border-amber-400/30 px-4 py-1.5 text-sm text-amber-100/70 hover:border-amber-400 hover:text-amber-300"
              }
            >
              Todos ({artworks.length})
            </Badge>
          </button>
          {periods.map((p) => {
            const count = artworks.filter((a) => a.periodo === p.id).length;
            const active = filter === p.id;
            return (
              <button key={p.id} onClick={() => setFilter(p.id)}>
                <Badge
                  variant={active ? "default" : "outline"}
                  className={
                    active
                      ? "cursor-pointer bg-amber-400 px-4 py-1.5 text-sm text-[#0b1020] hover:bg-amber-300"
                      : "cursor-pointer border-amber-400/30 px-4 py-1.5 text-sm text-amber-100/70 hover:border-amber-400 hover:text-amber-300"
                  }
                >
                  {p.nome} ({count})
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Timeline vertical por período */}
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-amber-400/60 via-amber-400/20 to-transparent md:left-1/2" />
          {grouped.map(({ period, items }) => (
            <div key={period.id} className="relative mb-20 last:mb-0">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative mb-8 pl-12 md:pl-0 md:text-center"
              >
                <div className="absolute left-4 top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-amber-400 bg-[#0b1020] md:left-1/2" />
                <h3 className="font-serif text-3xl text-amber-300">{period.nome}</h3>
                <p className="text-sm uppercase tracking-widest text-amber-100/40">
                  {period.anos} · {period.local}
                </p>
                <p className="mx-auto mt-3 max-w-2xl text-amber-100/60">{period.descricao}</p>
              </motion.div>
              <div className="grid gap-6 pl-12 sm:grid-cols-2 md:pl-0 lg:grid-cols-3">
                {items.map((art) => (
                  <ArtworkCard key={art.slug} artwork={art} onSelect={setSelected} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
