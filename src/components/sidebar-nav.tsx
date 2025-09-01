"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  BarChart3,
  Settings,
  Brain,
  Palette,
} from "lucide-react"
import { useState } from "react"

const navigationSections = [
  {
    title: "Executive Overview",
    items: [
      {
        title: "Strategic Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ]
  },
  {
    title: "Intelligence Creation",
    items: [
      {
        title: "Strategic Content",
        href: "/dashboard/content",
        icon: Brain,
      },
      {
        title: "My Intelligence",
        href: "/dashboard/my-posts",
        icon: TrendingUp,
      },
    ]
  },
  {
    title: "Network Intelligence",
    items: [
      {
        title: "Strategic Network",
        href: "/dashboard/network",
        icon: Users,
      },
      {
        title: "Performance Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
      },
    ]
  },
  {
    title: "Platform Control",
    items: [
      {
        title: "System Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
      {
        title: "Theme Control",
        component: "theme-toggle",
        icon: Palette,
      },
    ]
  }
]

export function SidebarNav() {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  
  const handleHover = (itemHref: string | null) => {
    setHoveredItem(itemHref)
    // Potential for subtle sound effect here in future
    // playHoverSound()
  }

  return (
    <nav className="flex flex-col gap-6">
      {navigationSections.map((section, sectionIndex) => (
        <div key={section.title} className="space-y-2">
          {/* Section Header */}
          <div className="px-2 py-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="mt-1 h-px bg-gradient-to-r from-border/60 via-orange-500/20 to-border/60" />
          </div>
          
          {/* Section Items */}
          <div className="space-y-1">
            {section.items.map((item, itemIndex) => {
              const Icon = item.icon
              const isActive = item.href ? pathname === item.href : false
              
              // Handle special case for theme toggle component
              if (item.component === "theme-toggle") {
                return (
                  <div 
                    key={`${item.title}-${itemIndex}`}
                    className="relative group"
                    onMouseEnter={() => handleHover(`theme-toggle-${itemIndex}`)}
                    onMouseLeave={() => handleHover(null)}
                  >
                    {/* Hover indicator for theme toggle */}
                    {hoveredItem === `theme-toggle-${itemIndex}` && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gradient-to-b from-orange-400/60 to-amber-500/60 rounded-r-full transition-all duration-300 animate-pulse" />
                    )}
                    
                    <div className={cn(
                      "w-full flex items-center px-4 py-2 relative overflow-hidden transition-all duration-300 ease-out rounded-md",
                      "hover:translate-x-1 hover:shadow-lg hover:shadow-black/20 hover:scale-105",
                      "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-muted/60 hover:to-muted/40 border border-transparent hover:border-border/50"
                    )}>
                      {/* Background shimmer effect */}
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-orange-500/5 via-amber-500/10 to-orange-500/5" />
                      
                      {/* Icon with enhanced styling */}
                      <Icon className="mr-3 h-4 w-4 transition-all duration-300 relative z-10 group-hover:scale-110 text-muted-foreground group-hover:text-orange-400 group-hover:drop-shadow-sm" />
                      
                      {/* Text with enhanced styling */}
                      <span className="font-medium transition-all duration-300 relative z-10 group-hover:font-semibold mr-4">
                        {item.title}
                      </span>
                      
                      {/* Theme Toggle Component */}
                      <div className="relative z-10 ml-auto">
                        <ThemeToggle />
                      </div>
                      
                      {/* Hover ripple effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                      </div>
                    </div>
                  </div>
                )
              }
              
              // Regular navigation items
              return (
                <div 
                  key={item.href} 
                  className="relative group"
                  onMouseEnter={() => handleHover(item.href)}
                  onMouseLeave={() => handleHover(null)}
                >
                  {/* Active indicator with pulse effect */}
                  {isActive && (
                    <>
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-orange-400 to-amber-500 rounded-r-full shadow-lg shadow-orange-500/30" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-orange-400 to-amber-500 rounded-r-full animate-pulse" />
                    </>
                  )}
                  
                  {/* Hover indicator */}
                  {hoveredItem === item.href && !isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gradient-to-b from-orange-400/60 to-amber-500/60 rounded-r-full transition-all duration-300 animate-pulse" />
                  )}
                  
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start relative overflow-hidden transition-all duration-300 ease-out",
                      "hover:translate-x-1 hover:shadow-lg hover:shadow-black/20 hover:scale-105",
                      isActive 
                        ? "bg-gradient-to-r from-orange-500/20 to-amber-500/15 text-primary-foreground border border-orange-500/30 shadow-md shadow-orange-500/10 ml-2 scale-105" 
                        : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-muted/60 hover:to-muted/40 border border-transparent hover:border-border/50"
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      {/* Background shimmer effect */}
                      <div className={cn(
                        "absolute inset-0 opacity-0 transition-opacity duration-300",
                        !isActive && "group-hover:opacity-100 bg-gradient-to-r from-orange-500/5 via-amber-500/10 to-orange-500/5"
                      )} />
                      
                      {/* Icon with enhanced styling and bounce */}
                      <Icon className={cn(
                        "mr-3 h-4 w-4 transition-all duration-300 relative z-10 group-hover:scale-110",
                        isActive 
                          ? "text-orange-400 drop-shadow-sm animate-pulse" 
                          : "text-muted-foreground group-hover:text-orange-400 group-hover:drop-shadow-sm"
                      )} />
                      
                      {/* Text with enhanced styling */}
                      <span className={cn(
                        "font-medium transition-all duration-300 relative z-10",
                        isActive 
                          ? "text-primary-foreground font-semibold" 
                          : "group-hover:font-semibold"
                      )}>
                        {item.title}
                      </span>
                      
                      {/* Subtle glow effect for active item */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-md" />
                      )}
                      
                      {/* Hover ripple effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                      </div>
                      
                      {/* Click celebration particles */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-400 rounded-full opacity-0 group-active:opacity-100 group-active:scale-150 transition-all duration-200" />
                        <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-amber-400 rounded-full opacity-0 group-active:opacity-100 group-active:animate-bounce transition-all duration-300" style={{animationDelay: '50ms'}} />
                        <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-orange-300 rounded-full opacity-0 group-active:opacity-100 group-active:animate-bounce transition-all duration-300" style={{animationDelay: '100ms'}} />
                      </div>
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}