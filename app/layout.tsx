import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProgressSync from "@/components/ProgressSync";
import { Topbar } from "@/components/Topbar";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rust 道场 — 从零到后端实战",
  description: "调用 Rust Playground 真实编译运行的中文 Rust 后端实战学习平台。",
};

const themeScript =
  "try{var t=localStorage.getItem('rustdojo:theme')||'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','dark')}document.documentElement.classList.add('fx-js')";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ProgressSync />
        <Topbar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
