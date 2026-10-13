import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadFlow",
  description: "Track leads, log discussions and never miss a follow-up.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
