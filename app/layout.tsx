import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Layout } from "@/components/Layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Custom Dress Studio",
  description: "Design your dream dress or try on existing designs with AI",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Layout>{children}</Layout>
        <Toaster />
      </body>
    </html>
  )
}
