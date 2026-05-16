import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { weddingConfig } from "@/lib/wedding-config";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inmaculada y Alejandro · Boda",
  description:
    "Boda en Sevilla, 5 de diciembre de 2026: información, RSVP, música y fotos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${montserrat.variable} h-full antialiased`}
    >
      <head>
        {weddingConfig.backgroundMusic.src ? (
          <link
            rel="preload"
            href={weddingConfig.backgroundMusic.src}
            as="audio"
            type="audio/mpeg"
          />
        ) : null}
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
