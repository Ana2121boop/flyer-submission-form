FROM node:20-slim

WORKDIR /app

# Copy all package.json files first to leverage Docker layer caching
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

# Install all deps including dev (we use tsx at runtime to run TS directly)
RUN npm install --include=dev --no-audit --no-fund

# Copy source
COPY . .

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
