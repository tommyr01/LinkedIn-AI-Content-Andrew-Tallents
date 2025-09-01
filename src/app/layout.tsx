import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/theme-provider"
// import { Toaster } from "@/components/ui/sonner" // Disabled - no more pop-ups
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
})

export const metadata: Metadata = {
  title: "AMPLIFY - Strategic LinkedIn Intelligence Platform",
  description: "Executive-focused LinkedIn intelligence platform for strategic content creation and network insights. Powered by Andrew Tallents' authentic voice patterns.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          {children}
        </Providers>
        {/* <Toaster /> Disabled - no more annoying pop-ups */}
      </body>
    </html>
  )
}