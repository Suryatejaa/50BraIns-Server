FROM node:20-slim

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci

# Copy prisma schema and generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy remaining files
COPY . .

EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:4001/health || exit 1

CMD ["npm", "start"]
