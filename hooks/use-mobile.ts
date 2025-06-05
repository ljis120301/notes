import * as React from "react"

// Define breakpoints following Tailwind CSS conventions
const BREAKPOINTS = {
  sm: 640,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (laptops)
  xl: 1280,  // Extra large devices (desktops)
  '2xl': 1536 // 2X Extra large devices (large desktops)
} as const

export function useMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < BREAKPOINTS.md)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// Enhanced hook for more detailed responsive information
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<{
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
    isSmall: boolean
    isMedium: boolean
    isLarge: boolean
    isXLarge: boolean
    is2XLarge: boolean
    width: number
  }>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isSmall: false,
    isMedium: false,
    isLarge: false,
    isXLarge: false,
    is2XLarge: false,
    width: 0
  })

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      
      setBreakpoint({
        isMobile: width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isDesktop: width >= BREAKPOINTS.lg,
        isSmall: width >= BREAKPOINTS.sm,
        isMedium: width >= BREAKPOINTS.md,
        isLarge: width >= BREAKPOINTS.lg,
        isXLarge: width >= BREAKPOINTS.xl,
        is2XLarge: width >= BREAKPOINTS['2xl'],
        width
      })
    }

    updateBreakpoint()
    
    const mediaQueryLists = Object.entries(BREAKPOINTS).map(([key, value]) => {
      const mql = window.matchMedia(`(min-width: ${value}px)`)
      mql.addEventListener("change", updateBreakpoint)
      return mql
    })

    return () => {
      mediaQueryLists.forEach(mql => 
        mql.removeEventListener("change", updateBreakpoint)
      )
    }
  }, [])

  return breakpoint
}

// Hook for specific breakpoint matching
export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    
    mql.addEventListener("change", onChange)
    setMatches(mql.matches)
    
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}
