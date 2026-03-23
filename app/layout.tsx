import type { Metadata } from "next";
import Script from "next/script";
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
      <head>
        <Script
          defer
          data-domain="interactive-research-agent.vercel.app"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
