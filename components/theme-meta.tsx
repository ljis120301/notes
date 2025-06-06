"use client"

import { useTheme } from "next-themes"
import { useEffect } from "react"

export function ThemeMeta() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    // Remove existing theme-color meta tags
    const existingMeta = document.querySelector('meta[name="theme-color"]')
    if (existingMeta) {
      existingMeta.remove()
    }

    // Create new meta tag with theme-appropriate color
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    
    // Set color based on current theme (using exact sidebar colors)
    switch (resolvedTheme) {
      case 'dark':
        meta.content = '#34363f' // oklch(0.205 0 0) - dark sidebar
        break
      case 'frappe':
        meta.content = '#292c3c' // Catppuccin frappé sidebar (mantle)
        break
      case 'light':
      default:
        meta.content = '#fafafa' // oklch(0.985 0 0) - light sidebar  
        break
    }

    // Add media attribute for dark mode detection as fallback
    const darkModeMeta = document.createElement('meta')
    darkModeMeta.name = 'theme-color'
    darkModeMeta.media = '(prefers-color-scheme: dark)'
    darkModeMeta.content = '#34363f'

    // Add the meta tags to the document head
    document.head.appendChild(meta)
    document.head.appendChild(darkModeMeta)

    // Also update the status bar style for iOS Safari
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (!statusBarMeta) {
      statusBarMeta = document.createElement('meta')
      statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
      document.head.appendChild(statusBarMeta)
    }
    
    // Set status bar style based on theme
    switch (resolvedTheme) {
      case 'dark':
      case 'frappe':
        statusBarMeta.setAttribute('content', 'black-translucent')
        break
      case 'light':
      default:
        statusBarMeta.setAttribute('content', 'default')
        break
    }

    // Cleanup function
    return () => {
      const metaToRemove = document.querySelector('meta[name="theme-color"]')
      if (metaToRemove) {
        metaToRemove.remove()
      }
    }
  }, [resolvedTheme])

  return null // This component doesn't render anything visible
} 