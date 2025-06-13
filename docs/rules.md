# Tiptap Editor Document Import/Export Implementation Task

## Project Context
You are implementing document import/export functionality for a notes application using:
- **Frontend**: Next.js 15 with Tailwind CSS 4 (NO tailwind.config.js file)
- **Editor**: Tiptap Editor
- **Backend**: PocketBase
- **Requirements**: Full implementation, no shortcuts, complete risk assessment

## Core Objectives

### 1. Document Export Functionality
Implement export capabilities for the following formats:
- **PDF** - Primary export format for sharing/printing
- **DOCX** - Microsoft Word compatibility
- **Markdown** - Developer-friendly format
- **HTML** - Web-compatible format
- **JSON** - Tiptap native format for backup/restore

### 2. Document Import Functionality
Implement import capabilities for:
- **DOCX** - Microsoft Word documents
- **Markdown** - Text files with markdown syntax
- **HTML** - Web documents
- **JSON** - Tiptap format restoration
- **Plain Text** - Basic text files

## Technical Implementation Requirements

### Frontend Architecture (Next.js 15)
```typescript
// Required approach for Next.js 15 implementation:
```

1. **File Handling Components**:
   - Create `DocumentImporter` component with drag-and-drop interface
   - Create `DocumentExporter` component with format selection
   - Implement progress indicators for large file operations
   - Add file validation and error handling

2. **Tiptap Integration**:
   - Research and implement proper Tiptap extensions for import/export
   - Use Tiptap's official conversion methods where available
   - Handle editor content serialization/deserialization
   - Maintain editor state consistency during operations

3. **Client-Side Processing**:
   - Implement file reading using FileReader API
   - Add client-side format conversion where possible
   - Implement chunked processing for large files
   - Add compression for JSON exports

### Backend Integration (PocketBase)

1. **File Upload Security**:
   - Implement file type validation
   - Add file size limits (configurable)
   - Sanitize uploaded content
   - Implement virus scanning if possible

2. **Storage Strategy**:
   - Store temporary files during processing
   - Implement cleanup for temporary files
   - Handle concurrent upload operations
   - Add backup/versioning for important documents

3. **API Endpoints**:
   - Create secure upload endpoints
   - Implement conversion processing endpoints
   - Add progress tracking for long operations
   - Handle authentication and authorization

### Risk Assessment & Backend Safety

**CRITICAL**: Before making ANY backend changes, you must:

1. **Connection Analysis**:
   - Map all existing PocketBase connections
   - Identify dependent frontend components
   - Document current API usage patterns
   - Check for real-time subscriptions that might be affected

2. **Data Integrity Checks**:
   - Verify current database schema
   - Check for existing file handling collections
   - Assess impact on existing user data
   - Plan rollback strategy for schema changes

3. **Performance Impact**:
   - Analyze file processing load on server
   - Plan for memory usage during conversions
   - Implement queue system for heavy operations
   - Add monitoring for resource usage

4. **Security Assessment**:
   - Validate file upload security measures
   - Check for potential injection vulnerabilities
   - Implement proper access controls
   - Add audit logging for file operations

## Specific Implementation Steps

### Phase 1: Research & Planning
1. Analyze current Tiptap setup and extensions
2. Research Tiptap's official conversion methods
3. Map existing PocketBase schema and API endpoints
4. Create detailed implementation plan with rollback options

### Phase 2: Frontend Implementation
1. Create file handling utilities
2. Implement drag-and-drop interface using modern HTML5 APIs
3. Build format-specific conversion functions
4. Add comprehensive error handling and user feedback
5. Implement progress tracking for long operations

### Phase 3: Backend Integration
1. **CAREFULLY** extend PocketBase schema if needed
2. Implement secure file upload endpoints
3. Add server-side format conversion capabilities
4. Create cleanup processes for temporary files
5. Add comprehensive logging and monitoring

### Phase 4: Testing & Validation
1. Test with various file formats and sizes
2. Validate data integrity through import/export cycles
3. Performance testing under load
4. Security testing for malicious file uploads
5. Cross-browser compatibility testing

## Format-Specific Requirements

### PDF Export
- Use libraries like Puppeteer or jsPDF
- Maintain formatting and layout
- Handle images and complex layouts
- Add pagination and headers/footers

### DOCX Handling
- Research Tiptap's official DOCX conversion
- Preserve formatting, styles, and images
- Handle tables and complex structures
- Maintain document metadata

### Markdown Processing
- Implement bidirectional conversion
- Preserve code blocks and formatting
- Handle images and links correctly
- Support extended markdown features

## Code Quality Standards

1. **TypeScript**: Full type safety, no `any` types
2. **Error Handling**: Comprehensive try-catch blocks
3. **Performance**: Lazy loading, code splitting
4. **Accessibility**: WCAG compliance for UI components
5. **Testing**: Unit tests for all conversion functions

## Tailwind CSS 4 Considerations
- Use only core Tailwind utility classes
- No custom configuration available
- Implement responsive design with built-in breakpoints
- Use CSS-in-JS for complex custom styles if needed

## Success Criteria

1. ✅ All specified formats import/export correctly
2. ✅ No data loss during conversion processes
3. ✅ Secure file handling with proper validation
4. ✅ Responsive UI with progress feedback
5. ✅ No interference with existing backend connections
6. ✅ Comprehensive error handling and recovery
7. ✅ Performance optimized for large files
8. ✅ Cross-browser compatibility
9. ✅ Proper cleanup of temporary files
10. ✅ Complete documentation and rollback plan

## Deliverables Expected

1. Complete implementation with all formats working
2. Comprehensive error handling and user feedback
3. Security assessment report
4. Performance benchmarks
5. Rollback plan for any backend changes
6. User documentation for new features
7. Technical documentation for maintenance

## Final Notes

- **NO LAZY IMPLEMENTATION**: Every feature must be fully functional
- **RESEARCH FIRST**: Understand Tiptap's conversion capabilities thoroughly
- **SAFETY FIRST**: Backend changes require careful analysis
- **USER EXPERIENCE**: Smooth, intuitive interface with clear feedback
- **MAINTAINABILITY**: Clean, well-documented code

Begin by providing a detailed analysis of the current setup and your implementation strategy, including potential risks and mitigation plans.