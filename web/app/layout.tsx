import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forge Admin",
  description: "Grapery Platform Admin Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider>
          <AuthProvider>
            {children}
            <Toaster theme="dark" />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
