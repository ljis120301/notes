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

// --- Components ---

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

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
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
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
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

      {isMobile && <ToolbarSeparator />}

    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function SimpleEditor({ 
  initialContent = '', 
  onContentChange,
  noteId,
  noteTitle 
}: SimpleEditorProps = {}) {
  console.log('🏁 SimpleEditor component initialized with:', {
    initialContentLength: initialContent.length,
    initialContentPreview: initialContent.substring(0, 100),
    hasOnContentChange: !!onContentChange,
    noteId,
    noteTitle
  })
  
  const isMobile = useMobile()
  const windowSize = useWindowSize()
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main")
  const toolbarRef = React.useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
      },
    },
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        HTMLAttributes: {
          class: 'tiptap-image',
        },
        allowBase64: true,
        inline: false,
      }),
      Typography,
      Superscript,
      Subscript,

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
    ],
    content: initialContent || '',
    onUpdate: ({ editor }) => {
      console.log('🔥 TipTap onUpdate fired! Editor exists:', !!editor)
      const content = editor.getHTML()
      console.log('🔥 TipTap onUpdate content length:', content.length, 'onContentChange exists:', !!onContentChange)
      console.log('🔥 TipTap onUpdate content preview:', content.substring(0, 150))
      console.log('🔥 TipTap onUpdate: Current timestamp:', Date.now())
      
      if (onContentChange) {
        console.log('📝 SimpleEditor: Content changed, calling onContentChange with length:', content.length)
        console.log('📝 SimpleEditor: Content preview being passed to onContentChange:', content.substring(0, 100))
        onContentChange(content)
        console.log('📝 SimpleEditor: onContentChange callback completed')
      } else {
        console.warn('⚠️ SimpleEditor: onContentChange callback is missing!')
      }
    },
    onCreate: ({ editor }) => {
      console.log('🚀 TipTap editor created successfully, content:', editor.getHTML().substring(0, 100))
    },
    onDestroy: () => {
      console.log('💥 TipTap editor destroyed')
    }
  })

  // Update editor content when initialContent changes - but be more careful about when to update
  React.useEffect(() => {
    console.log('📂 SimpleEditor: Effect triggered - checking content update', {
      hasEditor: !!editor,
      initialContentLength: initialContent?.length || 0,
      editorIsEmpty: editor?.isEmpty,
      editorCurrentLength: editor?.getHTML()?.length || 0
    })
    
    if (editor && initialContent !== undefined) {
      // Don't update if we're just switching from empty to empty
      if (initialContent === '' && editor.isEmpty) {
        console.log('📂 SimpleEditor: Skipping update - both initial and current content are empty')
        return
      }
      
      const currentContent = editor.getHTML()
      console.log('📂 SimpleEditor: Checking if content should update:', {
        initialContentLength: initialContent.length,
        currentContentLength: currentContent.length,
        initialContentPreview: initialContent.substring(0, 50),
        currentContentPreview: currentContent.substring(0, 50)
      })
      
      // More robust comparison - if initial content is different from current content
      if (initialContent !== currentContent) {
        console.log('🔄 SimpleEditor: Setting new content in editor')
        editor.commands.setContent(initialContent, false) // false = don't emit update event
        
        // Verify the content was actually set
        setTimeout(() => {
          const verifyContent = editor.getHTML()
          console.log('🔍 SimpleEditor: Content verification after setContent:', {
            expectedLength: initialContent.length,
            actualLength: verifyContent.length,
            matches: initialContent === verifyContent
          })
        }, 100)
      } else {
        console.log('📂 SimpleEditor: Content already matches, no update needed')
      }
    }
  }, [editor, initialContent])

  const bodyRect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={
            isMobile
              ? {
                  bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
                }
              : {}
          }
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <div className="content-wrapper">
          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content"
          />
        </div>
      </EditorContext.Provider>
    </div>
  )
}
