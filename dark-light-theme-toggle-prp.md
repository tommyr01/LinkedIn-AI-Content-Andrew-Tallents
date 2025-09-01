name: "Dark/Light Theme Toggle Feature PRP v1"
description: |

---

## Goal

**Feature Goal**: Implement a dark/light theme toggle in the left navigation sidebar that allows users to switch between the current dark theme and a new light theme with white backgrounds

**Deliverable**: Theme toggle component integrated into sidebar navigation with persistent theme state management

**Success Definition**: Users can toggle between dark and light themes, with their preference persisted across sessions and all UI components properly styled in both themes

## User Persona

**Target User**: Andrew Tallents and other executives using the AMPLIFY platform

**Use Case**: Users want to switch between dark and light themes based on their preference, environment lighting, or time of day

**User Journey**: 
1. User opens AMPLIFY dashboard
2. User sees current theme (dark by default)
3. User clicks theme toggle in left sidebar
4. Theme instantly switches to light/dark
5. User's preference is saved and persists on next visit

**Pain Points Addressed**: 
- Some users prefer light themes for better readability in bright environments
- Current hardcoded dark theme doesn't accommodate different user preferences

## Why

- Improves user experience and accessibility by providing theme options
- Follows modern UI/UX best practices where theme selection is expected
- Accommodates different user preferences and environmental needs
- Maintains brand consistency with orange/amber accent colors in both themes

## What

A theme toggle switch in the sidebar navigation that:
- Switches between dark and light themes instantly
- Persists user preference in localStorage
- Maintains all existing orange/amber branding in both themes
- Uses smooth transitions for theme changes
- Includes appropriate sun/moon icons

### Success Criteria

- [ ] Theme toggle appears in left sidebar navigation
- [ ] Clicking toggle instantly switches between dark/light themes
- [ ] Theme preference persists across browser sessions
- [ ] All components render correctly in both themes
- [ ] Orange/amber accent colors work well in both themes
- [ ] Smooth transitions between theme changes
- [ ] No accessibility regressions

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

### Documentation & References

```yaml
- url: https://next-themes.js.org/
  why: Best practice library for Next.js theme management with SSR support
  critical: Handles hydration issues and provides theme persistence

- file: src/app/layout.tsx
  why: Currently hardcoded to dark theme - needs modification
  pattern: Remove hardcoded className="dark"
  gotcha: Line 24 has hardcoded dark class that prevents theme switching

- file: src/app/globals.css
  why: Already contains both light and dark theme CSS variables
  pattern: CSS custom properties approach for theming
  gotcha: Both :root and .dark selectors are properly defined

- file: src/components/sidebar-nav.tsx
  why: Navigation component where toggle should be added
  pattern: Uses navigationSections array structure
  gotcha: Heavy use of orange/amber gradients that need to work in light theme

- file: tailwind.config.ts
  why: Already configured for class-based dark mode
  pattern: darkMode: ["class"] configuration
  gotcha: Uses CSS custom properties which makes theming easier

- file: src/components/ui/switch.tsx
  why: Existing switch component using Radix UI
  pattern: Radix UI switch with proper accessibility
  gotcha: Already styled to match design system
```

### Current Codebase tree

```bash
src/
├── app/
│   ├── layout.tsx              # Root layout with hardcoded dark theme
│   ├── globals.css             # Contains light/dark CSS variables
│   └── dashboard/
│       └── layout.tsx          # Dashboard layout with sidebar
├── components/
│   ├── sidebar-nav.tsx         # Main navigation component
│   └── ui/
│       └── switch.tsx          # Existing switch component
└── lib/
    └── utils.ts                # Utility functions
```

### Desired Codebase tree with files to be added

```bash
src/
├── components/
│   ├── theme-provider.tsx      # Theme context provider wrapper
│   └── theme-toggle.tsx        # Theme toggle switch component
├── hooks/
│   └── use-theme.ts           # Custom hook for theme management
└── lib/
    └── theme.ts               # Theme utilities and constants
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Next.js requires careful hydration handling for themes
// Example: next-themes handles SSR hydration automatically

// CRITICAL: Remove hardcoded className="dark" from layout.tsx
// This prevents theme switching from working

// GOTCHA: Heavy use of gradient classes in sidebar-nav.tsx
// Need to ensure orange/amber gradients work in light theme

// GOTCHA: CSS custom properties are already set up correctly
// Don't recreate - use existing :root and .dark CSS variables
```

## Implementation Blueprint

### Data models and structure

Theme state and configuration models:

```typescript
// Theme types and constants
type Theme = 'light' | 'dark' | 'system'

interface ThemeConfig {
  defaultTheme: Theme
  enableSystem: boolean
  storageKey: string
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: INSTALL next-themes dependency
  - RUN: npm install next-themes
  - WHY: Provides SSR-safe theme management for Next.js
  - HANDLES: Hydration issues, localStorage persistence, system preference

Task 2: CREATE src/components/theme-provider.tsx  
  - IMPLEMENT: ThemeProvider wrapper component using next-themes
  - PATTERN: Wrap app content with theme provider
  - NAMING: ThemeProvider component with proper TypeScript props
  - PLACEMENT: Components directory for reusable providers

Task 3: MODIFY src/app/layout.tsx
  - REMOVE: hardcoded className="dark" from html element (line 24)
  - ADD: ThemeProvider wrapper around body content  
  - PRESERVE: existing Inter font and metadata configuration
  - ENABLE: Dynamic theme class application

Task 4: CREATE src/components/theme-toggle.tsx
  - IMPLEMENT: Theme toggle switch component using existing Switch UI
  - FOLLOW: src/components/ui/switch.tsx for consistent styling
  - ADD: Sun/Moon icons from lucide-react
  - INTEGRATE: next-themes useTheme hook
  - STYLE: Match sidebar navigation aesthetic with orange/amber accents

Task 5: MODIFY src/components/sidebar-nav.tsx
  - ADD: ThemeToggle component to navigation sections
  - PLACE: In "Platform Control" section with System Settings
  - FOLLOW: Existing navigationSections array structure  
  - STYLE: Consistent with existing navigation item styling
  - PRESERVE: All existing navigation items and styling

Task 6: TEST light theme CSS variables
  - VERIFY: All components render correctly in light theme
  - CHECK: Orange/amber accent colors work in both themes
  - VALIDATE: No contrast issues or unreadable text
  - ADJUST: CSS variables if needed for light theme compatibility

Task 7: ADD theme transition animations  
  - IMPLEMENT: Smooth transition between themes
  - ADD: CSS transition properties for theme-aware elements
  - DURATION: 200-300ms for smooth but not slow transitions
  - PRESERVE: Existing animations and hover effects
```

### Implementation Patterns & Key Details

```typescript
// Theme Provider Pattern (next-themes)
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      storageKey="amplify-theme"
    >
      {children}
    </ThemeProvider>
  )
}

// Theme Toggle Component Pattern
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <div className="flex items-center gap-3">
      <Sun className="h-4 w-4 text-orange-400" />
      <Switch
        checked={theme === 'dark'}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
      <Moon className="h-4 w-4 text-orange-400" />
    </div>
  )
}

// GOTCHA: Use useEffect for mounted state to prevent hydration issues
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null

// CRITICAL: CSS transitions for smooth theme changes
.theme-transition {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

### Integration Points

```yaml
CSS:
  - verify: "Light theme CSS variables work with orange/amber accents"
  - add: "Transition classes for smooth theme switching"

LAYOUT:
  - modify: src/app/layout.tsx
  - remove: "hardcoded dark class"
  - wrap: "with ThemeProvider component"

NAVIGATION:
  - modify: src/components/sidebar-nav.tsx  
  - add: "ThemeToggle to Platform Control section"
  - maintain: "existing styling and structure"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation
npm run build                    # Ensure Next.js builds successfully
npm run type-check              # TypeScript validation
npm run lint                    # ESLint validation

# Expected: Zero build errors, clean TypeScript, no linting issues
```

### Level 2: Component Testing (Component Validation)

```bash
# Test theme switching functionality
npm run dev

# Manual testing checklist:
# 1. Toggle appears in sidebar "Platform Control" section
# 2. Clicking toggle switches between light/dark themes instantly  
# 3. Theme preference persists after page refresh
# 4. All navigation items render correctly in both themes
# 5. Orange/amber accents work well in both themes

# Expected: All manual tests pass, smooth theme transitions
```

### Level 3: Integration Testing (System Validation)

```bash
# Full application testing
npm run dev
# Navigate to all dashboard pages: /, /content, /my-posts, /network, /analytics, /settings
# Test theme toggle on each page
# Verify consistent theming across all components

# Browser testing:
# - Test in Chrome, Firefox, Safari
# - Test with different system theme preferences
# - Test localStorage persistence

# Expected: Consistent theming across all pages and browsers
```

### Level 4: Accessibility & UX Validation

```bash
# Accessibility testing
# - Test with screen readers
# - Verify color contrast in both themes meets WCAG AA standards
# - Test keyboard navigation to theme toggle
# - Test with high contrast system settings

# Performance testing  
# - Verify no layout shift during theme changes
# - Check for smooth transitions without jank
# - Test theme detection and application speed

# Expected: Full accessibility compliance, smooth performance
```

## Final Validation Checklist

### Technical Validation

- [ ] Next.js application builds without errors: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`  
- [ ] No linting issues: `npm run lint`
- [ ] Theme provider properly wraps application
- [ ] Theme toggle renders in sidebar navigation

### Feature Validation

- [ ] Theme toggle appears in "Platform Control" sidebar section
- [ ] Clicking toggle instantly switches between dark/light themes
- [ ] Theme preference persists across browser sessions  
- [ ] All dashboard pages render correctly in both themes
- [ ] Orange/amber accent colors work well in both light and dark themes
- [ ] Smooth transitions between theme changes
- [ ] System theme preference detection works (if enabled)

### Code Quality Validation

- [ ] Follows existing Next.js and React patterns
- [ ] Uses next-themes for proper SSR handling
- [ ] Integrates seamlessly with existing sidebar navigation
- [ ] Maintains existing component styling and structure
- [ ] No hardcoded theme classes in layout.tsx
- [ ] Proper TypeScript types for theme-related code

### Documentation & User Experience

- [ ] Theme toggle is intuitive with appropriate sun/moon icons
- [ ] Consistent styling with existing AMPLIFY design system
- [ ] No accessibility regressions
- [ ] Theme changes don't cause layout shifts or flashing

---

## Anti-Patterns to Avoid

- ❌ Don't create custom theme management when next-themes handles it better
- ❌ Don't leave hardcoded className="dark" in layout.tsx
- ❌ Don't ignore hydration issues - use next-themes mounted state
- ❌ Don't break existing orange/amber brand colors in light theme
- ❌ Don't place theme toggle in wrong navigation section
- ❌ Don't skip testing theme persistence across sessions
- ❌ Don't create jarring transitions - keep them smooth and fast