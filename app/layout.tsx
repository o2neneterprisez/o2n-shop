import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { StoreProvider } from "@/components/store/StoreProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "O2N E-Mall",
  description: "Discover local sellers, approved products, and a modern digital marketplace experience.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense
          fallback={
            <div className="store-provider-loading" aria-busy="true">
              <span>Loading O2N E-Mall…</span>
            </div>
          }
        >
          <StoreProvider>{children}</StoreProvider>
        </Suspense>
      </body>
    </html>
  );
}
