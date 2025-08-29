import { SidebarNav } from "@/components/sidebar-nav"
import { Zap } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800/50 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 shadow-2xl relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
          <div className="absolute top-2/3 left-1/2 w-20 h-20 bg-orange-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        </div>
        
        <div className="flex h-full flex-col relative z-10">
          {/* Subtle overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-transparent to-gray-800/30 pointer-events-none" />
          
          {/* Logo/Brand */}
          <div className="relative flex h-14 items-center border-b border-gray-800/60 px-4 bg-gradient-to-r from-gray-900/80 to-gray-800/40 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/10" />
            <div className="relative flex items-center gap-2">
              <div className="relative">
                <Zap className="h-5 w-5 text-orange-400 animate-pulse" />
                <div className="absolute inset-0 bg-orange-400/20 blur-sm rounded-full animate-ping" />
              </div>
              <h2 className="text-lg font-semibold amplify-gradient-text">
                AMPLIFY
              </h2>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
          </div>
          
          {/* Navigation */}
          <div className="relative flex-1 px-3 py-6 bg-gradient-to-b from-gray-900/40 to-gray-950/60">
            <SidebarNav />
          </div>
          
          {/* User Info */}
          <div className="relative border-t border-gray-800/60 p-4 bg-gradient-to-r from-gray-900/60 to-gray-800/40 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5" />
            <div className="relative flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Andrew Tallents</p>
                <p className="text-xs text-gray-400">CEO Coach</p>
              </div>
            </div>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <header className="border-b border-gray-800/50 bg-gradient-to-r from-gray-900/60 to-gray-800/40 backdrop-blur-sm">
          <div className="flex h-14 items-center px-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5" />
            <h1 className="relative text-lg font-semibold amplify-gradient-text">
              Strategic LinkedIn Intelligence
            </h1>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
          </div>
        </header>
        <main className="relative">{children}</main>
      </div>
    </div>
  )
}