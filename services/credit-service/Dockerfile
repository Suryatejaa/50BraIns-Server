FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S creditservice -u 1001

# Change ownership of the app directory
RUN chown -R creditservice:nodejs /app

# Switch to non-root user
USER creditservice

# Expose port
EXPOSE 4005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
              const options = { hostname: 'localhost', port: 4005, path: '/health', timeout: 2000 }; \
              const req = http.request(options, (res) => { \
                if (res.statusCode === 200) process.exit(0); \
                else process.exit(1); \
              }); \
              req.on('error', () => process.exit(1)); \
              req.end();"

# Start the application
CMD ["node", "src/index.js"]
