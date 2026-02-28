import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PiSign — Signage Control",
  description: "Raspberry Pi Zero 2W Digital Signage Control Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
