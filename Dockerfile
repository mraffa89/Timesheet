# Stage 1: Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Accept build arguments from Easypanel / Docker buildx
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Server (Nginx + Node.js SMTP Backend)
FROM nginx:alpine

# Evita falha de handshake TLS no apk em Alpine mínimo e instala Node.js + certificados CA
RUN sed -i 's/https/http/g' /etc/apk/repositories && \
    apk update && \
    apk add --no-cache ca-certificates nodejs

WORKDIR /app
# Copy built static assets
COPY --from=build /app/dist /usr/share/nginx/html
# Copy pre-installed node_modules from build stage (instant & avoids npm compilation in alpine)
COPY --from=build /app/node_modules /app/node_modules
COPY package*.json ./
# Copy Node.js SMTP backend server
COPY server.js /app/server.js

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3000 to match Easypanel default and nginx.conf
EXPOSE 3000

# Start SMTP backend service and Nginx
CMD ["sh", "-c", "node /app/server.js & nginx -g 'daemon off;'"]

