# Claude 4 Sonnet: Sidebar Auto-Sort & Pin Functionality Implementation

## Task Overview
You are tasked with implementing sidebar functionality for a Next.js 15.3.3 notes application that uses Tiptap editor, Tailwind CSS 4, and PocketBase backend. The sidebar needs two key features:
1. **Auto-sort by most recently modified** - Notes should automatically sort with the most recently modified at the top
2. **Pin favorite notes** - Users can pin important notes to keep them at the top of the sidebar

## Critical Requirements

### 🚨 NON-NEGOTIABLES
- **DO NOT take shortcuts or leave incomplete implementations**
- **DO NOT interfere with existing PocketBase backend calls or connection**
- **MUST resolve ALL bugs encountered during implementation**
- **MUST follow Next.js 15.3.3 best practices throughout**
- **MUST use Shadcn/ui components exclusively for UI elements**
- **COMPLETE the entire task fully before responding**

### Technology Stack
- **Framework**: Next.js 15.3.3
- **Styling**: Tailwind CSS 4
- **Editor**: Tiptap (refer to official npm documentation)
- **UI Components**: Shadcn/ui (check installation status, install if needed)
- **Backend**: PocketBase (DO NOT MODIFY backend calls)

## Implementation Requirements

### 1. Shadcn/ui Component Management
```bash
# First, ONLY use shadcn components:
# DO NOT create components
# Install any missing components needed for the sidebar:
# Common components you may need:


### 2. Sidebar Auto-Sort Functionality
- Implement automatic sorting by `lastModified` timestamp
- Sort should happen in real-time as notes are modified
- Most recently modified note should appear at the top
- Maintain sort order persistence across page refreshes
- Handle edge cases (notes without timestamps, identical timestamps)

### 3. Pin Favorite Notes Feature
- Add pin/unpin toggle button for each note in sidebar
- Pinned notes should always appear above unpinned notes
- Within pinned section, maintain chronological order by last modified
- Visual indicator for pinned status (pin icon, different styling)
- Persist pin status (likely in PocketBase, but respect existing data structure)

### 4. UI/UX Requirements
- Use Shadcn/ui components for all interactive elements
- Implement smooth animations for reordering and pin state changes
- Add tooltips for pin/unpin actions
- Responsive design that works on mobile and desktop
- Accessibility features (keyboard navigation, screen reader support)
- Visual feedback for user actions

### 5. State Management
- Use appropriate React state management (useState, useReducer, or context)
- Implement optimistic updates for better UX
- Handle loading states gracefully
- Implement error boundaries for robust error handling

### 6. Integration Guidelines
- **PocketBase Integration**: 
  - Respect existing data schema
  - Use existing API endpoints without modification
  - If new fields needed (like `pinned` status), add them safely
  - Maintain existing authentication and permissions
- **Tiptap Integration**:
  - Hook into Tiptap's document change events for auto-sort triggers
  - Ensure editor performance isn't impacted by sidebar updates
  - Use Tiptap's official documentation for all integrations

### 7. Performance Considerations
- Implement efficient sorting algorithms
- Use React.memo and useMemo where appropriate
- Debounce frequent updates to prevent excessive re-renders
- Lazy load note previews if needed
- Optimize re-renders during drag operations (if implementing drag-to-reorder)

## Expected Deliverables


### Implementation Steps
1. **Analysis Phase**: Examine existing codebase and PocketBase schema
2. **Component Planning**: Design component hierarchy and data flow
3. **Shadcn Setup**: Install and configure required UI components
4. **Core Logic**: Implement sorting and pinning logic
5. **UI Implementation**: Build responsive, accessible interface
6. **Integration**: Connect with existing Tiptap and PocketBase systems
7. **Testing**: Test all functionality thoroughly
8. **Bug Resolution**: Fix any issues encountered
9. **Performance Optimization**: Optimize for production use

## Error Handling Requirements
- Graceful degradation if PocketBase is unavailable
- User-friendly error messages for failed operations
- Retry mechanisms for network failures
- Console logging for debugging (removable in production)

## Testing Checklist
- [ ] Auto-sort works with new note creation
- [ ] Auto-sort triggers on note modification
- [ ] Pin/unpin functionality works correctly
- [ ] Pinned notes stay at top, sorted by last modified
- [ ] Unpinned notes sort correctly below pinned notes
- [ ] Responsive design works on all screen sizes
- [ ] Keyboard navigation functions properly
- [ ] No interference with existing PocketBase operations
- [ ] Performance remains smooth with large note collections
- [ ] Error states display appropriate feedback

## Code Quality Standards
- Use TypeScript with strict type checking
- Follow Next.js 15.3.3 conventions and best practices
- Implement proper error boundaries
- Use semantic HTML and ARIA attributes
- Follow React best practices (hooks rules, component patterns)
- Clean, readable code with appropriate comments
- No console.log statements in production code

## Final Validation
Before completing the task, ensure:
1. All features work as specified
2. No existing functionality is broken
3. Code follows all specified standards
4. Performance is acceptable
5. All bugs have been resolved
6. Documentation is clear and complete

## Remember: 
- **NO SHORTCUTS** - Complete the full implementation
- **NO BACKEND INTERFERENCE** - Respect existing PocketBase setup  
- **RESOLVE ALL BUGS** - Don't leave any issues unresolved
- **USE SHADCN EXCLUSIVELY** - Check installation status first
- **FOLLOW NEXT.JS 15.3.3 BEST PRACTICES** - Use latest patterns and conventions