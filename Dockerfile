FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --ignore-scripts
COPY backend/ ./
RUN npx prisma generate
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
