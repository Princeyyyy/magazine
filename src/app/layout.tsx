import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { env } from "@/env";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
});

export const viewport: Viewport = {
  themeColor: "#D93272",
};

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL || "https://magazine.bobostudio.co.ke"),
  title: "Custom Magazine — Product of Bobo Studio",
  description:
    "Create a personalised, one-of-a-kind glossy magazine crafted from the stories, memories, and photos shared by someone who loves them. A product of Bobo Studio.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Custom Magazine — Product of Bobo Studio",
    description:
      "Create a personalised, one-of-a-kind glossy magazine crafted from the stories, memories, and photos shared by someone who loves them.",
    images: [{ url: "/preview.png", width: 1200, height: 630, alt: "Custom Magazine Preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Magazine — Product of Bobo Studio",
    description:
      "Create a personalised, one-of-a-kind glossy magazine crafted from the stories, memories, and photos shared by someone who loves them.",
    images: ["/preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-[#FAF6F3] text-[#1F1619] flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
