import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chelba Coif | Barber Shop à Djerba",
  description:
    "Chelba Coif, barber shop à Djerba. Coupes modernes, fades, barbe et finitions précises. Réservez votre rendez-vous facilement.",
  keywords: [
    "Chelba Coif",
    "barber Djerba",
    "coiffeur Djerba",
    "barber shop Djerba",
    "coiffeur homme Djerba",
    "fade Djerba",
    "barbe Djerba",
  ],
  openGraph: {
    title: "Chelba Coif | Barber Shop à Djerba",
    description:
      "Coupes modernes, fades, barbe et finitions précises à Djerba.",
    type: "website",
    locale: "fr_TN",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
