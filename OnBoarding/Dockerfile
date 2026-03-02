# Use Node.js 18 for better compatibility
FROM node:18

# Install curl and build tools for native modules
RUN apt-get update && apt-get install -y curl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for development)
RUN npm install

# Copy source code (excluding node_modules to avoid architecture conflicts)
COPY src ./src
COPY tsconfig.json ./
COPY docs ./docs

# Expose port
EXPOSE 4000

# Health check - use curl instead of node for ES modules compatibility
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start the application in development mode
CMD ["npm", "run", "dev"]
