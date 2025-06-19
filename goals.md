# Claude 4 Sonnet Implementation Prompt: Avatar System & Account Editor

## Project Context
You are implementing a comprehensive Avatar system and Account Editor for a Next.js 15.3.3 notes application using Tailwind 4 (WITHOUT tailwind.config file) and PocketBase backend. The Shadcn Avatar component is already installed and available.

**CRITICAL: Before making ANY changes, you MUST:**
1. **READ AND ANALYZE the existing codebase thoroughly**
2. **UNDERSTAND the current project structure and patterns**
3. **IDENTIFY existing React Query implementation and caching strategies**
4. **FOLLOW established code patterns and conventions**
5. **INTEGRATE with existing state management and data fetching**

## Critical Implementation Requirements

### ABSOLUTE CODING STANDARDS - NO EXCEPTIONS:
- **NEVER be lazy or take shortcuts**
- **NEVER comment out code you don't understand**
- **NEVER use placeholder comments like "implement later", "rest of code here", "add more functionality"**
- **ALWAYS provide complete, functional implementations**
- **ENSURE production-ready code that compiles successfully**
- **IMPLEMENT every feature fully and completely**

### Technical Stack:
- **Frontend**: Next.js 15.3.3 (App Router)
- **Styling**: Tailwind 4 (NO tailwind.config file - use only built-in classes)
- **Backend**: PocketBase
- **UI Components**: Shadcn (Avatar component already installed)
- **Data Fetching**: React Query (TanStack Query) - **MUST use existing implementation**
- **Caching**: Follow existing caching strategies and patterns
- **State Management**: Integrate with existing state management approach

### PocketBase Configuration:
- **Collection**: "users"
- **Avatar Field**: "avatar" (configured to accept image input)
- **Additional fields**: Handle any other standard user fields as needed

## Features to Implement

### 1. Avatar Management System
- **Avatar Upload Functionality**
  - File selection with drag-and-drop support
  - Image preview before upload
  - File validation (size, type, dimensions)
  - Progress indicator during upload
  - Error handling for failed uploads
  - Support for common formats (PNG, JPG, JPEG, WebP)

- **Avatar Display Components**
  - Use existing Shadcn Avatar component
  - Fallback to initials when no avatar exists
  - Different sizes for different contexts
  - Loading states during avatar fetching

### 2. Account Editor Interface
- **Profile Management Page/Modal**
  - Edit display name with validation
  - Change avatar with preview
  - Save/Cancel functionality
  - Real-time validation feedback
  - Success/error notifications

- **User Profile Display**
  - Current avatar display
  - Display name
  - Account information summary

### 3. Backend Integration
- **PocketBase API Integration**
  - **USE existing React Query patterns and hooks**
  - **FOLLOW existing caching strategies**
  - **INTEGRATE with current query key patterns**
  - User authentication handling (use existing auth system)
  - Avatar file upload to PocketBase
  - Display name update functionality
  - Profile data fetching with proper cache invalidation
  - Error handling for all API calls
  - Optimistic updates where appropriate

- **React Query Implementation**
  - Use existing query client configuration
  - Follow established query key naming conventions
  - Implement proper cache invalidation strategies
  - Use mutations for avatar upload and profile updates
  - Handle loading states with existing patterns
  - Implement error boundaries as per project standards

- **File Management**
  - Avatar file storage in PocketBase
  - Old avatar cleanup when new one uploaded
  - Proper file URL generation for display

### 4. UI/UX Requirements
- **Responsive Design**
  - Mobile-first approach
  - Tablet and desktop optimization
  - Touch-friendly interface elements

- **Accessibility**
  - Proper ARIA labels
  - Keyboard navigation support
  - Screen reader compatibility
  - Focus management

- **Visual Design**
  - Modern, clean interface
  - Consistent with existing notes app design
  - Smooth animations and transitions
  - Loading states and feedback

## Implementation Deliverables

### Required Files and Components:
1. **Account Editor Page** (`app/account-editor/page.tsx` - using App Router structure)
2. **Avatar Upload Component** (dedicated component for avatar management)
3. **Profile Management Hook** (custom React Query hook for user profile operations)
4. **PocketBase Avatar Service** (API integration functions that work with React Query)
5. **Type Definitions** (TypeScript interfaces for user data - extend existing types)
6. **Utility Functions** (file validation, image processing if needed)
7. **React Query Mutations** (for avatar upload, profile updates with proper caching)

### Integration Points:
- **READ existing React Query setup and configuration**
- **FOLLOW existing query key patterns and naming conventions**
- **USE existing PocketBase service patterns**
- **INTEGRATE with current authentication system**
- **RESPECT existing caching strategies**
- Connect to current user session management
- Link to main navigation/user menu
- Ensure compatibility with existing notes app structure

## Technical Specifications

### File Upload Requirements:
- Maximum file size: 5MB
- Supported formats: PNG, JPG, JPEG, WebP
- Image optimization/resizing if needed
- Proper MIME type validation

### Validation Rules:
- Display name: Optional, up to 100 characters
- Avatar: Required file type and size validation
- Real-time validation with user feedback

### Error Handling:
- Network error handling
- File upload error handling
- Validation error display
- Graceful fallbacks for all failure scenarios

### Performance Considerations:
- Optimized image loading
- Efficient state management
- Minimal re-renders
- Proper cleanup of resources

## PocketBase Backend Requirements

### Collection Schema Updates (if needed):
- Ensure "users" collection has proper avatar field configuration
- Verify file upload settings and permissions
- Check authentication rules for profile updates

### API Endpoints to Implement:
- User profile fetch
- Avatar upload
- Profile update (display name, etc.)
- Avatar deletion/replacement

## Success Criteria

The implementation is successful when:
1. **All code compiles for production without errors**
2. **Avatar upload works end-to-end with PocketBase**
3. **Display name editing functions properly**
4. **UI is responsive and accessible**
5. **Error handling covers all edge cases**
6. **Integration with existing app is seamless**
7. **No placeholder code or "TODO" comments exist**
8. **All features are fully functional**

## Additional Instructions

- **MANDATORY FIRST STEP**: Thoroughly analyze the existing codebase to understand:
  - Current React Query setup and configuration
  - Existing query key patterns and naming conventions
  - PocketBase service layer implementation
  - Authentication system integration
  - Caching strategies and invalidation patterns
  - Component structure and design patterns
  - TypeScript interfaces and type definitions

- **Code Quality**: Write production-ready, maintainable code that matches existing patterns
- **Documentation**: Include clear JSDoc comments for functions (following existing documentation style)
- **Testing Considerations**: Structure code to be easily testable (match existing testing patterns)
- **Security**: Implement proper file upload security measures
- **Performance**: Optimize for fast loading and smooth interactions using React Query caching
- **Consistency**: Ensure all new code follows the established project conventions

Remember: This is a production application. Every line of code must be complete, functional, and ready for deployment. No shortcuts, no placeholders, no incomplete implementations.