import { Header, Footer } from "@/components/header";
import { Hero } from "@/components/hero";
import { Timeline } from "@/components/timeline";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Timeline />
      </main>
      <Footer />
    </>
  );
}
