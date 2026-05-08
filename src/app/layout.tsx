import type { Metadata, Viewport } from "next";
import "./globals.css";
import PhoneGate from "@/components/PhoneGate";

export const metadata: Metadata = {
  title: "Taksha Acharya — Carpentry Skill Mentor",
  description: "Master the craft. Build with confidence. AI-powered carpentry and woodworking training.",
  manifest: "/manifest.json",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7A4A24",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" data-scroll-behavior="smooth" data-theme="light" className="h-full">
      <body className="h-full bg-paper text-ink font-sans">
        <PhoneGate>{children}</PhoneGate>
      </body>
    </html>
  );
}
