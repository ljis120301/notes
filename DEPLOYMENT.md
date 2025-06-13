# Production Deployment Guide

This guide covers deploying your Notes App to production with optimal performance and security.

## Pre-deployment Checklist

### 1. Code Quality
```bash
# Run type checking
npm run type-check

# Fix linting issues
npm run lint:fix

# Build for production
npm run build
```

### 2. Environment Configuration

Create production environment variables:

```env
# Production PocketBase URL
NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-domain.com

# Optional: Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Optional: Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
```

### 3. PocketBase Production Setup

#### Collection Rules Configuration
Ensure your PocketBase collection rules are properly configured:

**Notes Collection Rules:**
- **List Rule:** `@request.auth.id != "" || isPublic = true`
- **View Rule:** `@request.auth.id != "" || isPublic = true`
- **Create Rule:** `@request.auth.id != ""`
- **Update Rule:** `@request.auth.id != "" && (@request.auth.id = user || @request.auth.id = author)`
- **Delete Rule:** `@request.auth.id != "" && (@request.auth.id = user || @request.auth.id = author)`

#### File Access Configuration
1. Mark file fields as "Protected" in PocketBase admin
2. Files will automatically follow collection View rules
3. Public notes will have publicly accessible images

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Deploy Frontend:**
   ```bash
   # Connect your GitHub repo to Vercel
   # Set environment variables in Vercel dashboard
   # Deploy automatically on push
   ```

2. **Deploy PocketBase:**
   - Use Railway, Fly.io, or DigitalOcean
   - Ensure HTTPS is enabled
   - Configure CORS for your frontend domain

### Option 2: Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build

   FROM node:18-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/next.config.js ./
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json ./package.json

   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Run:**
   ```bash
   docker build -t notes-app .
   docker run -p 3000:3000 -e NEXT_PUBLIC_POCKETBASE_URL=https://your-pb-url notes-app
   ```

### Option 3: Static Export

For static hosting (GitHub Pages, Netlify, etc.):

1. **Configure next.config.js:**
   ```javascript
   const nextConfig = {
     output: 'export',
     trailingSlash: true,
     images: {
       unoptimized: true
     }
   };
   ```

2. **Build and Export:**
   ```bash
   npm run build
   # Upload 'out' directory to your static host
   ```

## Performance Optimizations

### 1. Bundle Analysis
```bash
npm run build:analyze
```

### 2. Image Optimization
- Images are automatically optimized by Next.js
- WebP and AVIF formats are used when supported
- Configure CDN for better performance

### 3. Caching Strategy
- Static assets: 1 year cache
- API responses: 5 minutes cache
- Images: 1 hour cache

## Security Considerations

### 1. Security Headers
The app includes security headers in `next.config.js`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- X-XSS-Protection: 1; mode=block

### 2. PocketBase Security
- Use HTTPS in production
- Configure proper CORS settings
- Regular security updates
- Backup your database regularly

### 3. Environment Variables
- Never commit sensitive data to git
- Use platform-specific secret management
- Validate environment variables at build time

## Monitoring and Maintenance

### 1. Error Monitoring
Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage metrics

### 2. Performance Monitoring
- Core Web Vitals tracking
- Bundle size monitoring
- API response time monitoring

### 3. Regular Maintenance
- Update dependencies monthly
- Monitor security advisories
- Backup PocketBase data regularly
- Test sharing functionality after updates

## Troubleshooting

### Common Issues

1. **Images not loading in shared notes:**
   - Check PocketBase collection rules
   - Verify file field protection settings
   - Ensure CORS is configured correctly

2. **Build failures:**
   - Run `npm run type-check` to identify TypeScript errors
   - Check for missing environment variables
   - Verify all imports are correct

3. **Performance issues:**
   - Analyze bundle size with `npm run build:analyze`
   - Check for unnecessary re-renders
   - Optimize images and assets

### Support
For deployment issues, check:
1. Next.js deployment documentation
2. PocketBase hosting guides
3. Platform-specific documentation (Vercel, Railway, etc.) 