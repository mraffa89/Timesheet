# Stage 1: Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Server (Nginx + Node.js SMTP Backend)
FROM nginx:alpine
RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built static assets
COPY --from=build /app/dist /usr/share/nginx/html
# Copy Node.js SMTP backend server
COPY server.js /app/server.js

# Expose port 3000 to match Easypanel default and nginx.conf
EXPOSE 3000

# Start SMTP backend service and Nginx
CMD ["sh", "-c", "node /app/server.js & nginx -g 'daemon off;'"]
