# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Production Web Server
FROM nginx:alpine

# Clean default Nginx html files
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Write Nginx configuration listening on ports 80, 3000, and 8080 to match any Easypanel port mapping
RUN printf 'server {\n\
    listen 80;\n\
    listen 3000;\n\
    listen 8080;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Grant read permissions
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80 3000 8080

CMD ["nginx", "-g", "daemon off;"]
