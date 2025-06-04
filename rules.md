# Auto-Save Implementation Prompt for Claude 4 Sonnet

You are tasked with implementing a Google Docs-style auto-save feature for a Next.js notes app. This is a **critical production feature** that requires complete, robust implementation with zero shortcuts or placeholder code.

## STRICT REQUIREMENTS - NO EXCEPTIONS

### 1. COMPLETION STANDARDS
- **NEVER use placeholders, TODOs, or "implement this later" comments**
- **NEVER skip error handling or edge cases**
- **NEVER provide incomplete code snippets**
- Every function, hook, and component must be fully functional and production-ready
- All code must be complete with proper error boundaries and fallback states
- If you encounter ANY bugs during implementation, you MUST resolve them completely before proceeding

### 2. TECHNOLOGY STACK CONSTRAINTS
- **Next.js 15.3.3** - Follow latest App Router patterns and best practices
- **Tailwind CSS 4** - Use only Tailwind 4 syntax and features
- **Tiptap Editor** - Integrate with existing Tiptap npm docs component
- **PocketBase Backend** - DO NOT modify, interfere with, or risk existing backend connections
- **TypeScript** - All code must be fully typed with proper interfaces

### 3. BACKEND INTEGRATION RULES
- **PRESERVE all existing PocketBase API calls and connection logic**
- **DO NOT modify existing authentication or data fetching patterns**
- **DO NOT change existing database schema or field names**
- **ONLY add new frontend auto-save logic that works with existing backend**
- **MUST maintain backward compatibility with current save mechanisms**

### 4. AUTO-SAVE FEATURE SPECIFICATIONS

#### Core Functionality:
- **Debounced auto-save** - Save after user stops typing (configurable delay, default 2 seconds)
- **Visual indicators** - Clear status showing "Saving...", "Saved", or "Error" states
- **Conflict resolution** - Handle concurrent edits gracefully
- **Offline support** - Queue saves when offline, sync when back online
- **Performance optimization** - Only save when content actually changes
- **Error recovery** - Retry failed saves with exponential backoff

#### Technical Implementation:
- **Custom React hooks** for auto-save logic
- **Proper cleanup** of timers and subscriptions
- **Memoization** to prevent unnecessary re-renders
- **Optimistic updates** with rollback on failure
- **Local storage backup** for unsaved changes
- **Network status detection** and appropriate handling

#### User Experience:
- **Non-intrusive** - Never block user from typing or editing
- **Informative** - Always show current save status
- **Reliable** - Guarantee no data loss under normal conditions
- **Fast** - Minimize perceived latency

### 5. INTEGRATION REQUIREMENTS

#### With Tiptap:
- Hook into Tiptap's transaction system for change detection
- Maintain editor focus and cursor position during saves
- Preserve all existing Tiptap extensions and configurations
- Handle rich text content serialization properly

#### With Next.js 15.3.3:
- Use Server Components where appropriate
- Implement proper client-side state management
- Follow App Router conventions for data fetching
- Utilize React 18+ features (concurrent features, Suspense, etc.)
- Implement proper loading states and error boundaries

#### With Tailwind 4:
- Use container queries and modern CSS features
- Implement proper responsive design
- Use CSS custom properties for theming
- Follow Tailwind 4 best practices for component styling



### 6. IMPLEMENTATION CHECKLIST

You must implement ALL of the following:

**Core Auto-Save Logic:**
- [ ] Debounced save mechanism with configurable delay
- [ ] Change detection that ignores cursor/selection changes
- [ ] Save queue management for multiple rapid changes
- [ ] Optimistic updates with proper rollback

**Error Handling:**
- [ ] Network error recovery with exponential backoff
- [ ] Validation error handling and user feedback
- [ ] Concurrent edit conflict resolution
- [ ] Graceful degradation when backend is unavailable

**Performance Optimization:**
- [ ] Content diffing to avoid unnecessary saves
- [ ] Request deduplication for identical content
- [ ] Memory leak prevention (cleanup timers/subscriptions)
- [ ] Efficient re-rendering with proper memoization

**User Experience:**
- [ ] Clear visual indicators for all save states
- [ ] Non-blocking UI during save operations
- [ ] Keyboard shortcut for manual save (Ctrl+S/Cmd+S)
- [ ] Unsaved changes warning on page exit

**Integration:**
- [ ] Seamless Tiptap editor integration
- [ ] Preservation of existing PocketBase API patterns
- [ ] Proper TypeScript interfaces for all data structures
- [ ] Comprehensive error boundary implementation

### 7. TESTING REQUIREMENTS

Provide implementation that handles these scenarios:
- User types continuously for extended periods
- Network connection drops during editing
- Multiple browser tabs editing same document
- Browser refresh with unsaved changes
- Backend API returns various error responses
- Extremely large documents (performance testing)

### 8. DELIVERABLES

Provide complete, production-ready code including:

1. **Full component implementations** with proper TypeScript typing
2. **Custom hooks** with comprehensive error handling
3. **Integration code** showing how to replace existing editor
4. **Configuration options** for customizing auto-save behavior
5. **Migration guide** for updating existing components
6. **Example usage** with proper Next.js App Router patterns

### 9. DEBUGGING COMMITMENT

If ANY bugs arise during implementation:
- **STOP immediately** and fix the bug completely
- **TEST the fix** thoroughly before continuing
- **EXPLAIN the bug** and why your solution resolves it
- **ENSURE no regressions** are introduced by the fix

## SUCCESS CRITERIA

The implementation is complete ONLY when:
- ✅ All code is production-ready with zero placeholders
- ✅ Auto-save works flawlessly in all common scenarios
- ✅ Existing PocketBase integration remains unmodified and functional
- ✅ All TypeScript types are properly defined
- ✅ Error handling covers all edge cases
- ✅ Performance is optimized for large documents
- ✅ User experience is smooth and informative
- ✅ Code follows Next.js 15.3.3 and Tailwind 4 best practices

**Remember: This is production code that users will depend on. NO shortcuts, NO "implement later" comments, NO incomplete functionality. Everything must work perfectly from day one.**