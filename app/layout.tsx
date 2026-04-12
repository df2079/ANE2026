import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Art Niche Expo Awards 2026",
  description: "Mobile-first voting app for Art Niche Expo Awards 2026."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
