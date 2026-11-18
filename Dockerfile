FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Install Playwright Chromium + system libraries for Linux container
RUN npx playwright-core install chromium --with-deps

# Copy source and build production frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "start"]
