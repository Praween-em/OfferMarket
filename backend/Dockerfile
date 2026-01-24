# Base image
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the app
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma/

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "run", "start:prod"]
