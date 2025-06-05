"use client"

import * as React from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem } from "@tiptap/extension-task-item"
import { TaskList } from "@tiptap/extension-task-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Underline } from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import { FontFamily } from "@tiptap/extension-font-family"

// --- Custom Extensions ---
import { Link } from "@/components/tiptap-extension/link-extension"
import { Selection } from "@/components/tiptap-extension/selection-extension"
import { TrailingNode } from "@/components/tiptap-extension/trailing-node-extension"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { FontFamilyDropdownMenu } from "@/components/tiptap-ui/font-family-dropdown-menu/font-family-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockQuoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useMobile } from "@/hooks/use-mobile"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-ui-primitive/button/button.scss"
import "@/components/tiptap-ui-primitive/toolbar/toolbar.scss"
import "@/components/tiptap-ui-primitive/dropdown-menu/dropdown-menu.scss"
import "@/components/tiptap-ui-primitive/popover/popover.scss"
import "@/components/tiptap-ui-primitive/separator/separator.scss"
import "@/components/tiptap-ui-primitive/tooltip/tooltip.scss"
import "@/styles/_variables.scss"
import "@/styles/_keyframe-animations.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"
import "@/components/tiptap-templates/simple/simple-editor.scss"

interface SimpleEditorProps {
  initialContent?: string
  onContentChange?: (content: string) => void
  noteId?: string
  noteTitle?: string
}

// Performance monitoring - only in development
const usePerformanceMonitor = () => {
  const renderCountRef = React.useRef(0)
  
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      renderCountRef.current++
      console.log(`SimpleEditor render count: ${renderCountRef.current}`)
    }
  })

  return renderCountRef.current
}

// Static toolbar components - completely isolated from editor state
const StaticMainToolbarContent = React.memo(() => {
  const isMobile = useMobile()
  
  const [mobileView, setMobileView] = React.useState<"main" | "highlighter" | "link">("main")
  
  const handleHighlighterClick = React.useCallback(() => setMobileView("highlighter"), [])
  const handleLinkClick = React.useCallback(() => setMobileView("link"), [])
  const handleBack = React.useCallback(() => setMobileView("main"), [])

  if (isMobile && mobileView === "highlighter") {
    return (
      <>
        <ToolbarGroup>
          <Button onClick={handleBack} data-style="ghost">
            <ArrowLeftIcon className="tiptap-button-icon" />
            <HighlighterIcon className="tiptap-button-icon" />
          </Button>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ColorHighlightPopoverContent />
      </>
    )
  }

  if (isMobile && mobileView === "link") {
    return (
      <>
        <ToolbarGroup>
          <Button onClick={handleBack} data-style="ghost">
            <ArrowLeftIcon className="tiptap-button-icon" />
            <LinkIcon className="tiptap-button-icon" />
          </Button>
        </ToolbarGroup>
        <ToolbarSeparator />
        <LinkContent />
      </>
    )
  }

  // Mobile main view - simplified toolbar
  if (isMobile) {
    return (
      <>
        <ToolbarGroup>
          <UndoRedoButton action="undo" />
          <UndoRedoButton action="redo" />
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <HeadingDropdownMenu levels={[1, 2, 3]} />
          <ListDropdownMenu types={["bulletList", "orderedList"]} />
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <MarkButton type="bold" />
          <MarkButton type="italic" />
          <MarkButton type="underline" />
          <ColorHighlightPopoverButton onClick={handleHighlighterClick} />
          <LinkButton onClick={handleLinkClick} />
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <ImageUploadButton text="+" />
        </ToolbarGroup>
      </>
    )
  }

  // Desktop full toolbar
  return (
    <>
      <Spacer />
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
        <FontFamilyDropdownMenu />
        <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
        <BlockQuoteButton />
        <CodeBlockButton />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        <ColorHighlightPopover />
        <LinkPopover />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>
      <Spacer />
    </>
  )
})

StaticMainToolbarContent.displayName = "StaticMainToolbarContent"

export const SimpleEditor = React.memo(({ 
  initialContent = '', 
  onContentChange,
  noteId
}: SimpleEditorProps) => {
  const isMobile = useMobile()
  const windowSize = useWindowSize()
  const toolbarRef = React.useRef<HTMLDivElement>(null)
  
  // Performance monitoring
  usePerformanceMonitor()

  // Track current note ID to prevent content resets during typing
  const currentNoteIdRef = React.useRef(noteId)

  // Content buffering for performance - heavily debounced
  const contentBufferRef = React.useRef(initialContent)
  const debounceTimerRef = React.useRef<NodeJS.Timeout | undefined>(undefined)
  const lastEmittedContentRef = React.useRef(initialContent)

  // Aggressive debouncing - balance between performance and sync speed
  const debouncedContentChange = React.useCallback((content: string) => {
    contentBufferRef.current = content
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // 1.5 second delay - fast enough for good UX, slow enough for performance
    debounceTimerRef.current = setTimeout(() => {
      if (onContentChange && contentBufferRef.current !== lastEmittedContentRef.current) {
        lastEmittedContentRef.current = contentBufferRef.current
        onContentChange(contentBufferRef.current)
      }
    }, 1500)
  }, [onContentChange])

  // Static extensions - never recreated
  const extensions = React.useMemo(() => [
    StarterKit.configure({
      history: {
        depth: 30, // Reduce for better performance
        newGroupDelay: 2000, // Longer grouping
      },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Underline,
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    Image.configure({
      HTMLAttributes: { class: 'tiptap-image' },
      allowBase64: true,
      inline: false,
    }),
    Typography.configure({
      // Disable performance-heavy transforms that exist
      openDoubleQuote: false,
      closeDoubleQuote: false,
      openSingleQuote: false,
      closeSingleQuote: false,
      leftArrow: false,
      rightArrow: false,
      copyright: false,
      trademark: false,
      servicemark: false,
      registeredTrademark: false,
      plusMinus: false,
      notEqual: false,
      laquo: false,
      raquo: false,
      multiplication: false,
      superscriptTwo: false,
      superscriptThree: false,
    }),
    Superscript,
    Subscript,
    TextStyle,
    FontFamily.configure({ types: ['textStyle'] }),
    Selection,
    ImageUploadNode.configure({
      accept: "image/*",
      maxSize: MAX_FILE_SIZE,
      limit: 3,
      upload: handleImageUpload,
      onError: (error: unknown) => console.error("Upload failed:", error),
    }),
    TrailingNode,
    Link.configure({ openOnClick: false }),
  ], [])

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
        "aria-label": "Main content area, start typing to enter text.",
      },
      // Disable all unnecessary DOM event handling
      handleDOMEvents: {
        // Block unnecessary event processing
        input: () => false,
        keydown: () => false,
        keyup: () => false,
        compositionstart: () => false,
        compositionend: () => false,
      },
    },
    extensions,
    content: initialContent,
    onUpdate: ({ editor }) => {
      // Ultra-lightweight content change - no React state updates
      debouncedContentChange(editor.getHTML())
    },
  })

  // Only update editor content when switching notes (noteId changes), not on content updates
  React.useEffect(() => {
    if (editor && noteId !== currentNoteIdRef.current) {
      // Note switched - safe to update content
      currentNoteIdRef.current = noteId
      
      if (initialContent !== contentBufferRef.current) {
        editor.commands.setContent(initialContent, false)
        contentBufferRef.current = initialContent
        lastEmittedContentRef.current = initialContent
      }
    }
  }, [editor, noteId, initialContent]) // Watch noteId changes for note switching

  const bodyRect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        // Emit final content on unmount
        if (onContentChange && contentBufferRef.current !== lastEmittedContentRef.current) {
          onContentChange(contentBufferRef.current)
        }
      }
    }
  }, [onContentChange])

  if (!editor) {
    return (
      <div className="simple-editor-wrapper">
        <div className="content-wrapper">
          <div className="simple-editor-content">
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Loading editor...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        {isMobile ? (
          <>
            <Toolbar ref={toolbarRef} className="toolbar-mobile-top">
              <StaticMainToolbarContent />
            </Toolbar>
            <div className="content-wrapper">
              <EditorContent
                editor={editor}
                role="presentation"
                className="simple-editor-content"
              />
            </div>
          </>
        ) : (
          <>
            <Toolbar
              ref={toolbarRef}
              style={{
                bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
              }}
            >
              <StaticMainToolbarContent />
            </Toolbar>
            <div className="content-wrapper">
              <EditorContent
                editor={editor}
                role="presentation"
                className="simple-editor-content"
              />
            </div>
          </>
        )}
      </EditorContext.Provider>
    </div>
  )
}, (prevProps, nextProps) => {
  // Smart memo: Allow re-renders when noteId changes (note switching)
  // But prevent re-renders during normal typing (when only internal state changes)
  return prevProps.noteId === nextProps.noteId && 
         prevProps.initialContent === nextProps.initialContent
})

SimpleEditor.displayName = "SimpleEditor"
