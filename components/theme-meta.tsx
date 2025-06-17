"use client"

import { useTheme } from "next-themes"
import { useEffect } from "react"

export function ThemeMeta() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    // Find or create the light-theme meta tag (no media attribute)
    let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }

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

    // Dark-scheme meta (kept constant)
    let darkModeMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]') as HTMLMetaElement | null
    if (!darkModeMeta) {
      darkModeMeta = document.createElement('meta')
      darkModeMeta.name = 'theme-color'
      darkModeMeta.media = '(prefers-color-scheme: dark)'
      darkModeMeta.content = '#34363f'
      document.head.appendChild(darkModeMeta)
    }

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
  }, [resolvedTheme])

  return null // This component doesn't render anything visible
} 