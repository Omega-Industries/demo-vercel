import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snake Game",
  description: "A simple Snake game ready to deploy on Vercel.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
