# Stage 1: Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine
# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built static assets
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 3000 to match Easypanel default and nginx.conf
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
