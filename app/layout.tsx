import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Art Niche Expo Awards 2026",
  description: "Mobile-first voting app for Art Niche Expo Awards 2026."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={raleway.variable}>{children}</body>
    </html>
  );
}
