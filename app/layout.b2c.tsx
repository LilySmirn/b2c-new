import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyMed B2C",
  description: "Static B2C pages for EasyMed search and cart",
};

export default function StaticB2cRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}