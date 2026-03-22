import type { Metadata } from "next";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactive Research Agent",
  description: "Make research papers interactive",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
