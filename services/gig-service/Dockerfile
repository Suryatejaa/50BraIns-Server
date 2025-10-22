# Use Node 20 Alpine for all services
FROM node:20-alpine

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma schema (if exists)
COPY prisma* ./

# Generate Prisma client (if schema exists)
RUN [ -f "schema.prisma" ] && npx prisma generate || echo "No Prisma schema found"

# Copy source code
COPY src ./src/

# Create logs directory
RUN mkdir -p logs

# Expose port (will be overridden by Railway)
EXPOSE 4004

# Health check (optional but recommended)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:4004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || true

# Start the service
CMD ["npm", "start"]
