import type { Metadata } from "next";
import { MuseumExperience } from "@/components/museum3d/museum-experience";

export const metadata: Metadata = {
  title: "Museu 3D — Museu Van Gogh",
  description:
    "Caminhe em 3D pela entrada do museu, abra as portas e veja as 50 obras de Van Gogh penduradas nas paredes.",
};

export default function MuseuPage() {
  return <MuseumExperience />;
}
