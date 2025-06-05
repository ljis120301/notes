# Mobile Optimization Prompt for Next.js 15 + Tailwind 4 Site

## Objective
Add comprehensive mobile responsiveness and optimize the site for smaller screen sizes while maintaining all existing functionality, themes, and database connections.

## Critical Requirements & Constraints

### Framework & Technology Standards
- **Next.js 15**: Follow all Next.js 15 conventions, standards, and best practices
- **Tailwind 4**: Use Tailwind 4 syntax and features (NO tailwind.config.js file - Tailwind 4 doesn't use one)
- **TypeScript**: Fix all TypeScript errors and ensure production build compatibility
- **PocketBase**: DO NOT modify any backend DB calls or interfere with PocketBase connections

### Theme Support Requirements
Support all three themes with proper mobile optimization:
1. **Light Theme**
2. **Dark Theme** 
3. **Catppuccin Frappé Theme** (separate from dark theme)

### Methodology Requirements
- **No Shortcuts**: Use available tools to discover and understand missing information
- **Full Understanding**: Only make code changes after completely understanding each file's purpose and role
- **Comprehensive Analysis**: Examine the entire project structure before making changes

## Tasks to Complete

### 1. Project Discovery & Analysis
- Use tools to explore the current project structure
- Identify all components, layouts, and pages
- Understand the current theme implementation
- Map out the TipTap editor integration
- Document PocketBase connection patterns

### 2. Mobile Layout Optimization
- Implement responsive breakpoints for mobile, tablet, and desktop
- Optimize navigation for touch interfaces
- Ensure proper touch targets (minimum 44px)
- Implement mobile-first design approach
- Add proper spacing and typography scaling

### 3. TipTap Editor Mobile Optimization
Follow best practices for TipTap editor on mobile:
- Implement mobile-friendly toolbar
- Optimize editor controls for touch
- Ensure proper keyboard handling on mobile devices
- Add responsive editor container sizing
- Implement proper focus management

### 4. Theme Implementation
Ensure all three themes work properly on mobile:
- Light theme mobile optimizations
- Dark theme mobile optimizations  
- Catppuccin Frappé theme mobile optimizations
- Proper theme switching on mobile devices
- Consistent theme application across all components

### 5. Performance & Accessibility
- Optimize for mobile performance
- Ensure proper semantic HTML
- Implement proper ARIA labels
- Test with screen readers
- Optimize loading states for mobile

## Implementation Guidelines

### Tailwind 4 Specific
- Use native CSS custom properties for theming
- Utilize Tailwind 4's improved container queries
- Implement proper responsive utilities
- Use modern Tailwind 4 features for better mobile support

### Next.js 15 Specific
- Follow App Router conventions
- Use proper Server/Client Component patterns
- Implement proper loading and error boundaries
- Ensure proper metadata handling for mobile

### Mobile UX Best Practices
- Implement proper touch gestures
- Add loading states for mobile interactions
- Ensure proper form handling on mobile
- Implement proper mobile navigation patterns
- Add proper mobile-specific animations

## Deliverables

1. **Analysis Report**: Comprehensive understanding of current project structure
2. **Mobile-Optimized Components**: All components updated for mobile responsiveness
3. **Theme Implementation**: All three themes working on mobile
4. **TipTap Integration**: Mobile-optimized editor implementation
5. **TypeScript Compliance**: All TypeScript errors resolved
6. **Production Ready**: Verified build process works correctly

## Testing Requirements

- Test on multiple mobile devices/screen sizes
- Verify all themes work correctly on mobile
- Ensure TipTap editor functions properly on touch devices
- Confirm PocketBase connections remain intact
- Validate production build process

## Restrictions

- **NO tailwind.config.js creation** (Tailwind 4 doesn't use it)
- **NO backend/DB modifications** (preserve PocketBase connections)
- **NO shortcuts** (use tools to understand before changing)
- **NO TypeScript errors** (must build for production)

## Success Criteria

- Site is fully responsive on all screen sizes
- All three themes work perfectly on mobile
- TipTap editor is mobile-optimized
- No breaking changes to existing functionality
- Production build succeeds without errors
- PocketBase integration remains functional

Start by using available tools to explore and understand the current project structure, then proceed with the mobile optimization implementation following all specified requirements and constraints.