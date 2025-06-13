import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json(
        { error: 'File must be a .docx document' },
        { status: 400 }
      )
    }
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Use mammoth to convert DOCX to HTML
    const result = await mammoth.convertToHtml({ arrayBuffer })
    
    // Return the HTML content and any messages
    return NextResponse.json({
      success: true,
      html: result.value,
      messages: result.messages || [],
      filename: file.name
    })
    
  } catch (error) {
    console.error('DOCX conversion failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to convert DOCX file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 