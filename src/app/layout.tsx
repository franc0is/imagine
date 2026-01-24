import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imagine!",
  description: "Create magical pictures with your favorite characters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
