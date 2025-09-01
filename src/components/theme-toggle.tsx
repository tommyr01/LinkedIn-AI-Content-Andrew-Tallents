'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const themeHook = useTheme()
  
  useEffect(() => setMounted(true), [])
  
  // Early return if not mounted or theme context not available
  if (!mounted || !themeHook) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <Sun className="h-4 w-4 text-orange-400/50" />
        <div className="h-6 w-11 bg-muted rounded-full" />
        <Moon className="h-4 w-4 text-orange-400/50" />
      </div>
    )
  }
  
  const { theme, setTheme } = themeHook
  
  return (
    <div className="flex items-center gap-3">
      <Sun className="h-4 w-4 text-orange-400 transition-all duration-200" />
      <Switch
        checked={theme === 'dark'}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-amber-200 dark:data-[state=unchecked]:bg-amber-300"
      />
      <Moon className="h-4 w-4 text-orange-400 transition-all duration-200" />
    </div>
  )
}