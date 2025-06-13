// Type declarations for external modules
// This ensures compilation works in all environments including Docker

declare module 'turndown' {
  interface Options {
    headingStyle?: 'setext' | 'atx'
    hr?: string
    bulletListMarker?: '*' | '+' | '-'
    codeBlockStyle?: 'indented' | 'fenced'
    fence?: '```' | '~~~'
    emDelimiter?: '_' | '*'
    strongDelimiter?: '**' | '__'
    linkStyle?: 'inlined' | 'referenced'
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut'
    br?: string
    preformattedCode?: boolean
    blankReplacement?: (content: string, node: Node) => string
    keepReplacement?: (content: string, node: Node) => string
    defaultReplacement?: (content: string, node: Node) => string
  }

  interface Rule {
    filter: string | string[] | ((node: Node) => boolean)
    replacement: (content: string, node: Node, options?: Options) => string
  }

  class TurndownService {
    constructor(options?: Options)
    turndown(html: string): string
    addRule(key: string, rule: Rule): TurndownService
    keep(filter: string | string[] | ((node: Node) => boolean)): TurndownService
    remove(filter: string | string[] | ((node: Node) => boolean)): TurndownService
    escape(string: string): string
  }

  export = TurndownService
}

declare module 'mammoth' {
  interface ConvertToHtmlOptions {
    arrayBuffer?: ArrayBuffer
  }

  interface ConvertResult {
    value: string
    messages: Array<{
      type: string
      message: string
    }>
  }

  export function convertToHtml(options: ConvertToHtmlOptions): Promise<ConvertResult>
}

declare module 'file-saver' {
  export function saveAs(blob: Blob, filename: string): void
} 