FROM node:22-slim

# Install Chromium + fonts so Puppeteer can render PDFs server-side.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-dejavu-core \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy all package.json files first for layer caching
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace deps (include dev because tsx + vite are runtime/build tools)
RUN npm install --include=dev --no-audit --no-fund

# Copy the rest
COPY . .

# Build the React frontend (vite output -> apps/web/dist, served by Fastify)
RUN npm run build --workspace=@flyer/web

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
