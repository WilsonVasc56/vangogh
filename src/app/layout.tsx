import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://vangogh-git-main-naturativacell.vercel.app"),
  ),
  title: "Museu Van Gogh — Experiência Imersiva",
  description:
    "Museu virtual imersivo dedicado a Vincent van Gogh: explore 50 obras, uma linha do tempo e o museu 3D inspirado em Amsterdã.",
  manifest: "/manifest.webmanifest",
  applicationName: "Museu Van Gogh",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Museu Van Gogh",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Museu Van Gogh",
    title: "Museu Van Gogh — Experiência Imersiva",
    description:
      "Entre no museu virtual de Van Gogh, caminhe pelas salas cronológicas e descubra 50 obras marcantes.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Museu Van Gogh: experiência imersiva com 50 obras",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Museu Van Gogh — Experiência Imersiva",
    description:
      "Explore 50 obras de Van Gogh em uma experiência virtual imersiva.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b1020]">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
