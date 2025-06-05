# TipTap Editor Font Selection Integration Prompt

You are tasked with integrating a font selection tool into an existing React TipTap editor component. This implementation must follow Next.js 15 and Tailwind 4 best practices with strict adherence to the following requirements:

## Critical Requirements & Restrictions

### Tailwind 4 Compliance
- **FORBIDDEN**: Do NOT create any `tailwind.config.js` or `tailwind.config.ts` file under any circumstances
- Tailwind 4 uses CSS-based configuration and automatic discovery
- Use only native Tailwind 4 utility classes and CSS custom properties
- Implement font loading through CSS `@import` or `@font-face` declarations

### Code Quality Standards
- **NO SHORTCUTS**: Provide complete, production-ready code
- **NO PLACEHOLDERS**: Never use "// Rest of code here" or similar lazy implementations
- **NO BAND-AID FIXES**: Implement proper, maintainable solutions
- **FULL COMPLETION**: The font selection feature must be fully functional

### Technology Stack Constraints
- **Components**: Use ONLY Shadcn/ui components (install new ones if needed)
- **Backend**: Do NOT modify or interfere with PocketBase database operations
- **Framework**: Follow Next.js 15 App Router conventions and best practices

## Implementation Requirements

### 1. Font Selection Component
Create a comprehensive font selection dropdown that includes:
- A curated list of web-safe fonts and Google Fonts
- Font preview functionality showing actual font rendering
- Search/filter capability for easy font discovery
- Proper TypeScript interfaces and type safety
- Accessible keyboard navigation and screen reader support

### 2. TipTap Integration
Implement the font selection within the TipTap editor:
- Extend TipTap with custom font family extension if needed
- Integrate font selection into the editor toolbar
- Ensure font changes apply correctly to selected text
- Maintain undo/redo functionality
- Handle font persistence in editor content

### 3. Font Loading Strategy
Implement efficient font loading:
- Use CSS `@import` statements for Google Fonts
- Implement font display optimization (`font-display: swap`)
- Ensure fonts load only when selected/needed
- Handle loading states and fallbacks gracefully

### 4. Styling Requirements
Follow Tailwind 4 best practices:
- Use semantic color classes and CSS custom properties
- Implement responsive design patterns
- Follow Tailwind 4's container queries if applicable
- Use proper spacing, typography, and layout utilities

### 5. Performance Considerations
- Lazy load fonts to improve initial page performance
- Implement proper font subset loading if using Google Fonts
- Use font-display strategies to prevent layout shift
- Minimize bundle size impact

## Shadcn/ui Components to Utilize

Consider using these Shadcn components (install additional ones if needed):
- `Select` for the font dropdown
- `Button` for toolbar integration
- `Popover` for font preview
- `Input` for font search functionality
- `ScrollArea` for long font lists
- `Command` for searchable font selection

## Expected Deliverables

### 1. Font Selection Component (`FontSelector.tsx`)
Complete React component with:
- Font list management
- Search functionality
- Preview capabilities
- TipTap integration hooks

### 2. TipTap Extension (if needed)
Custom extension for font family support:
- Proper font family attribute handling
- Integration with TipTap's command system
- Schema definitions for font family nodes/marks

### 3. CSS Font Declarations
Proper font loading implementation:
- CSS file with font imports
- Font family definitions
- Loading optimization strategies

### 4. Integration Code
Show how to integrate into existing TipTap editor:
- Toolbar button implementation
- Command registration
- State management

### 5. TypeScript Definitions
Complete type definitions for:
- Font configuration objects
- Component props interfaces
- TipTap extension types


## Success Criteria

The implementation must:
1. ✅ Provide a working font selection dropdown in TipTap toolbar
2. ✅ Allow users to change font family of selected text
3. ✅ Show font previews in the selection dropdown
4. ✅ Load fonts efficiently without performance impact
5. ✅ Maintain proper TypeScript typing throughout
6. ✅ Follow all Tailwind 4 best practices (no config file)
7. ✅ Use only Shadcn/ui components for UI elements
8. ✅ Not interfere with PocketBase backend operations
9. ✅ Be fully accessible and keyboard navigable
10. ✅ Handle edge cases and error states gracefully

## Additional Context

- The editor should support both system fonts and web fonts
- Font changes should be immediately visible in the editor
- The solution should be scalable for adding more fonts later
- Consider internationalization if the application supports multiple languages
- Ensure the implementation works across different browsers and devices

Provide complete, production-ready code that fulfills all requirements without shortcuts or placeholders. The font selection feature should integrate seamlessly with the existing TipTap editor and enhance the user experience significantly.