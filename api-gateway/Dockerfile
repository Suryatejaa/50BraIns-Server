# Use Node 20 Alpine for all services
FROM node:20-alpine

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema (if exists)
COPY prisma* ./

# Copy source code
COPY src ./src/

# Run build process (validate, test, etc.)
RUN npm run build:production

# Remove dev dependencies for smaller image
RUN npm ci --only=production

# Create logs directory
RUN mkdir -p logs

# Expose port (will be overridden by Railway)
EXPOSE 3000

# Health check (optional but recommended)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || true

# Start the service
CMD ["npm", "start"]
