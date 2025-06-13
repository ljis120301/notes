import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(request: NextRequest) {
  try {
    const { html, options = {} } = await request.json()

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 })
    }

    // Launch Puppeteer browser with enhanced configuration for emoji support
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--font-render-hinting=none',
        '--enable-font-antialiasing',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images=false',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-default-apps'
      ]
    })

    const page = await browser.newPage()

    // Enhanced page configuration for better rendering
    await page.setViewport({ 
      width: 1200, 
      height: 800, 
      deviceScaleFactor: 2 
    })

    // Wait for fonts to load
    await page.evaluateOnNewDocument(() => {
      // Ensure font loading is complete
      document.fonts.ready.then(() => {
        console.log('All fonts loaded')
      })
    })

    // Create complete HTML document with enhanced emoji support and exact Tiptap styling
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Export</title>
    <style>
        /* Enhanced font imports with emoji support */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Apple+Color+Emoji&display=swap');
        
        * {
            box-sizing: border-box;
        }
        
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            font-family: 'Inter', 'Apple Color Emoji', 'Noto Color Emoji', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #0f172a;
            background: #ffffff;
            font-size: 16px;
            font-feature-settings: "liga" 1, "calt" 1;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* Emoji specific styling */
        .emoji, 
        span[style*="emoji"],
        *:not(code):not(pre) {
            font-family: 'Inter', 'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Segoe UI', system-ui, sans-serif;
        }
        
        /* Exact Tiptap/ProseMirror editor styling */
        .ProseMirror {
            outline: none;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        /* Headings - matching Tiptap defaults */
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.25rem;
            margin-bottom: 0.75rem;
            font-weight: 600;
            line-height: 1.25;
            color: #111827;
            letter-spacing: -0.025em;
        }
        
        h1 { 
            font-size: 2.25rem;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 1rem;
        }
        
        h2 { 
            font-size: 1.875rem;
            margin-top: 2rem;
        }
        
        h3 { 
            font-size: 1.5rem;
            margin-top: 1.5rem;
        }
        
        h4 { 
            font-size: 1.25rem;
        }
        
        h5, h6 { 
            font-size: 1.125rem;
        }
        
        /* Paragraphs - matching Tiptap */
        p {
            margin-top: 0;
            margin-bottom: 1rem;
            color: #374151;
            line-height: 1.625;
        }
        
        p:last-child {
            margin-bottom: 0;
        }
        
        /* Lists - exact Tiptap styling */
        ul, ol {
            margin-top: 0;
            margin-bottom: 1rem;
            padding-left: 1.625rem;
        }
        
        li {
            margin-bottom: 0.25rem;
            color: #374151;
            line-height: 1.625;
        }
        
        ul ul, ol ol, ul ol, ol ul {
            margin-top: 0.25rem;
            margin-bottom: 0.25rem;
        }
        
        /* Task Lists - exact Tiptap styling */
        ul[data-type="taskList"] {
            list-style: none;
            padding: 0;
            margin-left: 0;
        }
        
        li[data-type="taskItem"] {
            display: flex;
            align-items: flex-start;
            margin-bottom: 0.25rem;
        }
        
        li[data-type="taskItem"] > label {
            flex: 0 0 auto;
            margin-right: 0.5rem;
            user-select: none;
        }
        
        li[data-type="taskItem"] > div {
            flex: 1 1 auto;
        }
        
        li[data-type="taskItem"][data-checked="false"] > label::before {
            content: "☐";
            font-size: 1rem;
            color: #6b7280;
        }
        
        li[data-type="taskItem"][data-checked="true"] > label::before {
            content: "☑";
            font-size: 1rem;
            color: #059669;
        }
        
        /* Code - exact Tiptap styling */
        code {
            background-color: #f3f4f6;
            color: #db2777;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Menlo', 'Roboto Mono', 'Ubuntu Mono', monospace;
            font-size: 0.875em;
            font-weight: 500;
        }
        
        pre {
            background-color: #f9fafb;
            color: #374151;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Menlo', 'Roboto Mono', 'Ubuntu Mono', monospace;
            font-size: 0.875rem;
            line-height: 1.5;
            margin: 1.5rem 0;
            border: 1px solid #e5e7eb;
        }
        
        pre code {
            background: none;
            padding: 0;
            border-radius: 0;
            color: inherit;
            font-size: inherit;
            font-weight: 400;
        }
        
        /* Blockquotes - exact Tiptap styling */
        blockquote {
            border-left: 3px solid #d1d5db;
            margin: 1.5rem 0;
            padding-left: 1rem;
            color: #6b7280;
            font-style: italic;
        }
        
        blockquote p {
            margin: 0;
        }
        
        /* Tables - exact Tiptap styling */
        table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 1.5rem 0;
            overflow: hidden;
        }
        
        table td, table th {
            min-width: 1em;
            border: 1px solid #d1d5db;
            padding: 0.5rem 0.75rem;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
        }
        
        table th {
            font-weight: 600;
            text-align: left;
            background-color: #f9fafb;
            color: #111827;
        }
        
        table .selectedCell:after {
            z-index: 2;
            position: absolute;
            content: "";
            left: 0; right: 0; top: 0; bottom: 0;
            background: rgba(200, 200, 255, 0.4);
            pointer-events: none;
        }
        
        table .column-resize-handle {
            position: absolute;
            right: -2px; top: 0; bottom: -2px;
            width: 4px;
            background-color: #3b82f6;
            pointer-events: none;
        }
        
        /* Text formatting - exact Tiptap styling */
        strong, b {
            font-weight: 600;
            color: #111827;
        }
        
        em, i {
            font-style: italic;
        }
        
        u {
            text-decoration: underline;
        }
        
        s, strike, del {
            text-decoration: line-through;
        }
        
        /* Links */
        a {
            color: #2563eb;
            text-decoration: underline;
            text-underline-offset: 2px;
        }
        
        a:hover {
            color: #1d4ed8;
        }
        
        /* Images - proper sizing and layout */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1rem 0;
            border-radius: 0.375rem;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }
        
        /* Figure elements for image containers */
        figure {
            margin: 1.5rem 0;
            text-align: center;
        }
        
        figure img {
            margin: 0 auto;
        }
        
        figcaption {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: #6b7280;
            font-style: italic;
        }
        
        /* Horizontal rule */
        hr {
            border: none;
            border-top: 1px solid #d1d5db;
            margin: 2rem 0;
        }
        
        /* Print optimizations */
        @media print {
            body {
                padding: 20px;
                max-width: none;
                font-size: 12pt;
                line-height: 1.4;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
            }
            
            blockquote, pre, table, img, figure {
                page-break-inside: avoid;
            }
            
            a {
                color: inherit;
                text-decoration: none;
            }
            
            /* Ensure emojis print correctly */
            * {
                color-adjust: exact;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        /* Utility classes */
        .page-break {
            page-break-before: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        /* Ensure emoji rendering */
        .emoji-enhanced {
            font-family: 'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Emoji', sans-serif;
            font-variant-emoji: emoji;
        }
    </style>
</head>
<body>
    ${html}
</body>
</html>`

    // Set the HTML content and wait for all resources to load
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })

    // Wait for fonts to be fully loaded
    await page.evaluate(() => {
      return document.fonts.ready
    })

    // Wait for all images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images, img => {
          if (img.complete) return Promise.resolve()
          return new Promise(resolve => {
            img.addEventListener('load', resolve)
            img.addEventListener('error', resolve)
          })
        })
      )
    })

    // Additional wait to ensure emoji fonts and images are fully loaded
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Configure PDF options with high quality settings
    const pdfOptions = {
      format: 'A4' as const,
      printBackground: true,
      margin: {
        top: '1in',
        right: '0.75in', 
        bottom: '1in',
        left: '0.75in'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      omitBackground: false,
      ...options
    }

    // Generate PDF
    const pdf = await page.pdf(pdfOptions)

    // Close browser
    await browser.close()

    // Return PDF as response
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document.pdf"',
        'Content-Length': pdf.length.toString(),
      },
    })

  } catch (error) {
    console.error('PDF generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 