# Multi-stage Dockerfile for Healthcare Appointment & Follow-up Manager
FROM node:20-alpine AS builder

WORKDIR /app

# Copy server and client package definitions
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN cd server && npm install
RUN cd client && npm install

# Copy source codes
COPY server/ ./server/
COPY client/ ./client/

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY server/package*.json ./
RUN npm install --only=production

COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/client/dist ./public-client
COPY .env.example ./.env

EXPOSE 5000

CMD ["node", "dist/index.js"]
