# FORCE COMPLETE REDEPLOY 2024-08-15-1630 - CHANGE BASE IMAGE
FROM alpine:3.18
RUN apk add --no-cache nodejs npm
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --force
COPY . .
ENV NODE_ENV=production
ENV PORT=5000
CMD ["node", "server.js"]
