import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300","400","500","600","700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MedMind — Study OS for Nursing Students",
    template: "%s | MedMind",
  },
  description: "Plan rotations and exams, collaborate with peers, and stay focused with built‑in study tools.",
  applicationName: "MedMind",
  keywords: [
    "nursing study app",
    "student planner",
    "clinical rotations",
    "exam planning",
    "group collaboration",
    "pomodoro",
    "supabase",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "MedMind — Study OS for Nursing Students",
    description: "Plan rotations and exams, collaborate with peers, and stay focused with built‑in study tools.",
    siteName: "MedMind",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "MedMind" },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MedMind — Study OS for Nursing Students",
    description: "Plan rotations and exams, collaborate with peers, and stay focused with built‑in study tools.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F3D73",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
