import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Etarnity Meeting — Book a Meeting with Our Board",
    template: "%s · Etarnity Meeting",
  },
  description:
    "Discover the board members of Etarnity Global Innovation and book a meeting directly with your preferred member. Connect. Schedule. Collaborate.",
  keywords: ["Etarnity", "meeting booking", "board members", "schedule", "Etarnity Global Innovation"],
  authors: [{ name: "Etarnity Global Innovation" }],
  openGraph: {
    title: "Etarnity Meeting — Book a Meeting with Our Board",
    description:
      "Discover the board members of Etarnity Global Innovation and book a meeting directly with your preferred member.",
    siteName: "Etarnity Meeting",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Etarnity Meeting",
    description: "Book a meeting with the board members of Etarnity Global Innovation.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
