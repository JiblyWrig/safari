import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Safari Lion Simulator — 3D Multiplayer",
  description: "Roam the African savannah as a lion in this 3D multiplayer browser simulator. WASD controls, smooth animations, and real-time multiplayer.",
  keywords: ["lion simulator", "3D game", "safari", "multiplayer", "three.js", "browser game"],
  authors: [{ name: "Safari Lion" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Safari Lion Simulator",
    description: "3D multiplayer lion simulator in the browser",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Safari Lion Simulator",
    description: "3D multiplayer lion simulator in the browser",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
