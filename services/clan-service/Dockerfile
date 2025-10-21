FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package-simplified.json package.json
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY src/simplified-clan-service.js ./src/
COPY migrations ./migrations/

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 4003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the service
CMD ["npm", "start"]
