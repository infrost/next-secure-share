import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Footer from "./Footer";
import TranslateButton from "./TranslateButton";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Next Secure Share",
  description: "Securely share passwords for unlocking your files",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* 在这里添加居中和背景色 */}
        <main className="flex-1 flex justify-center items-center bg-gray-100">
          {children}
        </main>
        <Footer />
        <TranslateButton />
      </body>
    </html>
  );
}
