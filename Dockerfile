FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build Vite SPA production bundle
RUN npm run build

# Install serve globally for reliable static hosting
RUN npm install -g serve

# Expose default Easypanel port
EXPOSE 3000

# Start static server on port 3000 with SPA routing (-s)
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
