FROM node:20-bullseye

WORKDIR /app

# Install system deps
RUN apt-get update -y && apt-get install -y openssl

# Copy only package files first (for caching)
COPY package*.json ./

# Use npm ci (faster & cleaner)
RUN npm ci

# Copy rest of the project
COPY . .

# Generate prisma client
RUN npx prisma generate

EXPOSE 8080

CMD ["node", "src/server.js"]