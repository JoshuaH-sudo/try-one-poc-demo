"use client"

import type React from "react"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sidebar, SidebarHeader, SidebarContent, SidebarNav, SidebarNavItem } from "@/components/ui/sidebar"
import { Menu, X, Palette, Camera, Sparkles } from "lucide-react"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    {
      name: "Design Studio",
      href: "/",
      icon: Palette,
      description: "Create custom dress designs",
    },
    {
      name: "Virtual Try-On",
      href: "/try-on",
      icon: Camera,
      description: "Try on existing dresses",
    },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <span className="text-lg font-bold text-gray-900">Dress Studio</span>
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarNav>
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link key={item.name} href={item.href}>
                    <SidebarNavItem active={isActive}>
                      <Icon className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </SidebarNavItem>
                  </Link>
                )
              })}
            </SidebarNav>
          </SidebarContent>
        </Sidebar>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span className="font-bold text-gray-900">Dress Studio</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
