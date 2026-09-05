import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./typeset.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SettingsProvider } from "@/components/settings-provider";
import { ChatHistorySidebar } from "@/components/chat-history-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const fontSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oxy AI — Marketing Agent",
  description: "AI marketing execution — web search via Exa, questions, and Composio integrations.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased scheme-light dark:scheme-dark",
        fontSans.variable,
        fontMono.variable
      )}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-[15px] leading-relaxed text-foreground antialiased [font-feature-settings:'ss01','ss02','cv01','cv02'] [text-rendering:optimizeLegibility]">
        <ThemeProvider>
          <SettingsProvider>
            <SidebarProvider>
              <div className="flex h-svh w-full">
                <ChatHistorySidebar />
                <SidebarInset className="flex min-w-0 flex-1 flex-col">
                  <SiteHeader />
                  {children}
                </SidebarInset>
              </div>
            </SidebarProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
