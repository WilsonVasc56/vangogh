import { Header, Footer } from "@/components/header";
import { BookExperience } from "@/components/book/book-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O Livro — Museu Van Gogh",
  description:
    "Vincent van Gogh: uma biografia ilustrada em livro digital interativo. Folheie a vida do artista, de Zundert a Auvers-sur-Oise.",
};

export default function LivroPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col bg-[#0b1020] pt-16">
        <BookExperience />
      </main>
      <Footer />
    </>
  );
}
