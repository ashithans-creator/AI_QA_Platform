FROM node:20-alpine

WORKDIR /app

# Copy package and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build for production
COPY . .
RUN npm run build

# Install a simple static file server to serve the build output
RUN npm install -g serve

# Expose the frontend port
EXPOSE 3001

# Serve the application from the dist folder
CMD ["serve", "-s", "dist", "-l", "3001"]
