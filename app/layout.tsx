import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
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
    url: SITE_URL,
    siteName: "Chelba Coif",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: "Chelba Coif",
    description:
      "Barber shop à Djerba. Coupes modernes, fades, barbe et finitions précises.",
    url: SITE_URL,
    telephone: "+21650882529",
    priceRange: "15–30 TND",
  };

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema),
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
