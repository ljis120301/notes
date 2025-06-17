# Implement Shadcn Table Component in Tiptap Editor

You must create a complete, production-ready table extension for Tiptap that uses Shadcn/UI table components. No shortcuts, no incomplete implementations.

## Before You Start
1. Analyze the existing codebase - understand the current Tiptap setup, extensions, and document export system
2. Check how other React components are integrated
3. Identify any existing table functionality that needs to be replaced/updated

## What to Build

### Core Table Extension
- Custom Tiptap node extension for tables
- React NodeView component wrapping Shadcn Table components
- Complete ProseMirror schema for table structure
- All table commands: insert, delete rows/columns, merge cells, resize

### Table Features (All Required)
- Insert table with configurable dimensions
- Add/remove rows and columns
- Merge/split cells
- Cell alignment (left/center/right)
- Header row toggle
- Click-to-edit cells
- Tab navigation
- Keyboard shortcuts
- Context menu for table operations
- Column resizing
- Copy/paste table data

### Document Export Integration
- Ensure tables serialize correctly for all existing export formats (HTML, PDF, JSON, etc.)
- Test with the current export functions
- Handle complex table structures in exports
- Maintain styling in exported documents

### React Component Structure
Use Shadcn's Table, TableBody, TableCell, TableHead, TableHeader, TableRow components within a Tiptap ReactNodeView. Handle all interactions through Tiptap commands.

## Implementation Requirements
- Full TypeScript implementation
- Follow existing code patterns in the project
- Comprehensive error handling
- Performance optimization for large tables
- Accessibility compliance
- Complete test coverage
- Works in production build

## Success Criteria
1. Tables can be created, edited, and manipulated fully
2. All export formats work correctly with tables
3. Performance doesn't degrade
4. Code is production-ready and maintainable
5. No breaking changes to existing functionality

Build the complete implementation. Don't leave anything unfinished.