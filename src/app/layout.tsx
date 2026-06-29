import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Лила — Игра самопознания",
  description:
    "Трансформационная игра «Лила» — символическая карта сознания. Исследуй своё намерение через броски кубика и трактовки ведущего.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#08090f] text-[#c8cde0] antialiased">
        {children}
      </body>
    </html>
  );
}
