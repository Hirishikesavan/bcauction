# FORCE COMPLETE REDEPLOY 2024-08-15-1625 - CHANGE NODE VERSION
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --force
COPY . .
ENV NODE_ENV=production
ENV PORT=5000
CMD ["node", "server.js"]
