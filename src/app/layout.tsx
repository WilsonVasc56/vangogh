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
  title: "Museu Van Gogh — Experiência Imersiva",
  description:
    "Museu virtual imersivo dedicado a Vincent van Gogh: entrada inspirada no museu de Amsterdã e linha do tempo interativa com 37 obras e explicações.",
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
