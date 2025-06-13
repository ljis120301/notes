"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import { useWindowSize } from "@/hooks/use-window-size"

/**
 * Interface defining required parameters for the cursor visibility hook
 */
export interface CursorVisibilityOptions {
  /**
   * The TipTap editor instance
   */
  editor: Editor | null
  /**
   * Reference to the toolbar element that may obscure the cursor
   */
  overlayHeight?: number
  /**
   * Reference to the element to track for cursor visibility
   */
  elementRef?: React.RefObject<HTMLElement> | null
}

/**
 * Simplified DOMRect type containing only the essential positioning properties
 */
export type RectState = Pick<DOMRect, "x" | "y" | "width" | "height">

/**
 * Custom hook that works IN HARMONY with ProseMirror's native scroll management.
 * Only provides minimal assistance for edge cases where ProseMirror's scrollThreshold/scrollMargin isn't enough.
 */
export function useCursorVisibility({
  editor,
  overlayHeight = 0,
  elementRef = null,
}: CursorVisibilityOptions): RectState {
  const { height: windowHeight } = useWindowSize()
  const [rect, setRect] = React.useState<RectState>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })

  // Track user scroll intent to avoid interfering with manual scrolling
  const userScrollingRef = React.useRef(false)
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  // Update rect function
  const updateRect = React.useCallback(() => {
    const element = elementRef?.current ?? document.body
    const { x, y, width, height } = element.getBoundingClientRect()
    setRect({ x, y, width, height })
  }, [elementRef])

  // Set up observers and scroll tracking
  React.useEffect(() => {
    const element = elementRef?.current ?? document.body
    
    updateRect()

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateRect)
    })

    // Track user scrolling
    const handleScroll = () => {
      userScrollingRef.current = true
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        userScrollingRef.current = false
      }, 300) // Longer delay to avoid interference
      
      updateRect()
    }

    resizeObserver.observe(element)
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [elementRef, updateRect])

  // MINIMAL cursor visibility assistance - only for extreme edge cases
  React.useEffect(() => {
    if (!editor) return

    // Only intervene in extreme cases where ProseMirror's native handling isn't sufficient
    const checkForExtremeOutOfView = () => {
      // Don't interfere if user is manually scrolling or if editor isn't focused
      if (userScrollingRef.current || !editor.view.hasFocus()) return

      const { state, view } = editor
      const { from } = state.selection
      const cursorCoords = view.coordsAtPos(from)
      if (!cursorCoords) return

      // Only intervene for EXTREME cases - cursor completely outside viewport
      const cursorTop = cursorCoords.top
      const cursorBottom = cursorCoords.bottom
      
      // Check if cursor is completely outside the viewport (not just toolbar area)
      const isCompletelyAboveViewport = cursorBottom < 0
      const isCompletelyBelowViewport = cursorTop > windowHeight
      
      // Only scroll for truly extreme cases where ProseMirror's handling fails
      if (isCompletelyAboveViewport || isCompletelyBelowViewport) {
        console.log('Extreme cursor out of view detected, providing minimal assistance')
        
        let targetScrollY: number
        
        if (isCompletelyAboveViewport) {
          // Scroll up to show cursor with generous padding
          targetScrollY = window.scrollY + cursorTop - (overlayHeight + 100)
        } else {
          // Scroll down to show cursor with generous padding
          targetScrollY = window.scrollY + cursorBottom - windowHeight + 100
        }
        
        // Ensure we don't scroll to negative values
        targetScrollY = Math.max(0, targetScrollY)
        
        // Mark that we're scrolling to avoid interference
        userScrollingRef.current = true
        
        window.scrollTo({
          top: targetScrollY,
          behavior: "smooth",
        })
        
        // Reset scroll flag after completing
        setTimeout(() => {
          userScrollingRef.current = false
        }, 800) // Long timeout to avoid interference
      }
    }

    // Very conservative debouncing - only check occasionally
    let timeoutId: NodeJS.Timeout | undefined
    const debouncedCheck = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(checkForExtremeOutOfView, 500) // Very long delay
    }

    // Only listen for specific events that might cause extreme out-of-view situations
    const { view } = editor
    
    const handleExtremeNavigation = (event: KeyboardEvent) => {
      // Only check for navigation that might cause extreme jumps
      const extremeNavigationKeys = ['PageUp', 'PageDown', 'Home', 'End']
      
      if (extremeNavigationKeys.includes(event.key)) {
        // Even for these, wait a bit to let ProseMirror handle it first
        setTimeout(debouncedCheck, 1000)
      }
      // Don't check for arrow keys at all - let ProseMirror handle completely
    }
    
    view.dom.addEventListener('keydown', handleExtremeNavigation)
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      view.dom.removeEventListener('keydown', handleExtremeNavigation)
    }
  }, [editor, overlayHeight, windowHeight])

  return rect
}
