import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import NavigationProgress from "@/components/NavigationProgress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Retro Board",
  description: "Real-time sprint retrospective tool for agile teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NavigationProgress />
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
