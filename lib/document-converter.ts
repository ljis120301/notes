import type { Editor } from '@tiptap/react'
import { toast } from 'sonner'

// Simple document converter utilities
export class SimpleDocumentConverter {
  private editor: Editor

  constructor(editor: Editor) {
    this.editor = editor
  }

  // Export to JSON (Tiptap native format)
  exportToJSON(): void {
    try {
      const json = this.editor.getJSON()
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        editor: 'tiptap',
        content: json
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      
      this.downloadFile(blob, `document-${Date.now()}.json`)
      toast.success('Document exported as JSON')
    } catch (error) {
      console.error('JSON export failed:', error)
      toast.error('Failed to export JSON')
    }
  }

  // Export to HTML
  exportToHTML(): void {
    try {
      const html = this.editor.getHTML()
      
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Export</title>
    <style>
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        p {
            margin-bottom: 1em;
        }
        ul, ol {
            margin-bottom: 1em;
            padding-left: 2em;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 1em 0;
            padding-left: 1em;
            color: #666;
        }
        code {
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
        }
        pre {
            background: #f4f4f4;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1em;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
        }
        .task-list {
            list-style: none;
            padding-left: 0;
        }
        .task-list li {
            display: flex;
            align-items: center;
            margin-bottom: 0.5em;
        }
        .task-list input[type="checkbox"] {
            margin-right: 0.5em;
        }
    </style>
</head>
<body>
    ${html}
</body>
</html>`

      const blob = new Blob([fullHtml], { type: 'text/html' })
      this.downloadFile(blob, `document-${Date.now()}.html`)
      toast.success('Document exported as HTML')
    } catch (error) {
      console.error('HTML export failed:', error)
      toast.error('Failed to export HTML')
    }
  }

  // Export to Markdown (simplified)
  exportToMarkdown(): void {
    try {
      const html = this.editor.getHTML()
      const markdown = this.htmlToMarkdown(html)
      
      const blob = new Blob([markdown], { type: 'text/markdown' })
      this.downloadFile(blob, `document-${Date.now()}.md`)
      toast.success('Document exported as Markdown')
    } catch (error) {
      console.error('Markdown export failed:', error)
      toast.error('Failed to export Markdown')
    }
  }

  // Import from JSON
  async importFromJSON(file: File): Promise<void> {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      let content
      if (data.content) {
        // Exported from this system
        content = data.content
      } else if (data.type && data.content !== undefined) {
        // Direct Tiptap JSON
        content = data
      } else {
        throw new Error('Invalid JSON format')
      }

      this.editor.commands.setContent(content)
      toast.success('Document imported successfully')
    } catch (error) {
      console.error('JSON import failed:', error)
      toast.error('Failed to import JSON file')
    }
  }

  // Import from HTML
  async importFromHTML(file: File): Promise<void> {
    try {
      const html = await file.text()
      
      // Extract content from body tag if present
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      const content = bodyMatch ? bodyMatch[1] : html

      this.editor.commands.setContent(content)
      toast.success('Document imported successfully')
    } catch (error) {
      console.error('HTML import failed:', error)
      toast.error('Failed to import HTML file')
    }
  }

  // Import from Markdown (simplified)
  async importFromMarkdown(file: File): Promise<void> {
    try {
      const text = await file.text()
      const html = this.markdownToHtml(text)
      
      this.editor.commands.setContent(html)
      toast.success('Document imported successfully')
    } catch (error) {
      console.error('Markdown import failed:', error)
      toast.error('Failed to import Markdown file')
    }
  }

  // Import from plain text
  async importFromText(file: File): Promise<void> {
    try {
      const text = await file.text()
      
      // Convert plain text to basic HTML with paragraph breaks
      const html = text
        .split('\n\n')
        .map(paragraph => paragraph.trim())
        .filter(paragraph => paragraph.length > 0)
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('')

      this.editor.commands.setContent(html)
      toast.success('Document imported successfully')
    } catch (error) {
      console.error('Text import failed:', error)
      toast.error('Failed to import text file')
    }
  }

  // Handle file import based on extension
  async importFile(file: File): Promise<void> {
    const extension = file.name.split('.').pop()?.toLowerCase()
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit')
      return
    }

    switch (extension) {
      case 'json':
        await this.importFromJSON(file)
        break
      case 'html':
      case 'htm':
        await this.importFromHTML(file)
        break
      case 'md':
      case 'markdown':
        await this.importFromMarkdown(file)
        break
      case 'txt':
        await this.importFromText(file)
        break
      default:
        toast.error(`Unsupported file format: .${extension}`)
    }
  }

  // Utility: Download file
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Utility: Simple HTML to Markdown conversion
  private htmlToMarkdown(html: string): string {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html

    let markdown = ''
    
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || ''
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element
        const tagName = element.tagName.toLowerCase()
        const children = Array.from(element.childNodes).map(processNode).join('')
        
        switch (tagName) {
          case 'h1':
            return `# ${children}\n\n`
          case 'h2':
            return `## ${children}\n\n`
          case 'h3':
            return `### ${children}\n\n`
          case 'h4':
            return `#### ${children}\n\n`
          case 'h5':
            return `##### ${children}\n\n`
          case 'h6':
            return `###### ${children}\n\n`
          case 'p':
            return `${children}\n\n`
          case 'strong':
          case 'b':
            return `**${children}**`
          case 'em':
          case 'i':
            return `*${children}*`
          case 'code':
            return `\`${children}\``
          case 'pre':
            return `\`\`\`\n${children}\n\`\`\`\n\n`
          case 'blockquote':
            return `> ${children}\n\n`
          case 'ul':
            return `${children}\n`
          case 'ol':
            return `${children}\n`
          case 'li':
            const parent = element.parentElement
            const marker = parent?.tagName.toLowerCase() === 'ol' ? '1.' : '-'
            return `${marker} ${children}\n`
          case 'br':
            return '\n'
          case 'hr':
            return '---\n\n'
          default:
            return children
        }
      }
      
      return ''
    }

    return Array.from(tempDiv.childNodes).map(processNode).join('').trim()
  }

  // Utility: Simple Markdown to HTML conversion
  private markdownToHtml(markdown: string): string {
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Lists
      .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
      // Text formatting
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Line breaks
      .replace(/\n/gim, '<br>')

    // Clean up consecutive list items
    html = html.replace(/<\/ul>\s*<ul>/g, '').replace(/<\/ol>\s*<ol>/g, '')
    
    return html
  }
}

// Export utility function for easy use
export function createDocumentConverter(editor: Editor): SimpleDocumentConverter {
  return new SimpleDocumentConverter(editor)
} 