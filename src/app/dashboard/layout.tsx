import { SidebarNav } from "@/components/sidebar-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-background">
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-14 items-center border-b px-4">
            <h2 className="text-lg font-semibold">LinkedIn Assistant</h2>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 px-3 py-4">
            <SidebarNav />
          </div>
          
          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1">
                <p className="text-sm font-medium">Andrew Tallents</p>
                <p className="text-xs text-muted-foreground">CEO Coach</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <header className="border-b">
          <div className="flex h-14 items-center px-6">
            <h1 className="text-lg font-semibold">LinkedIn Content Assistant</h1>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}