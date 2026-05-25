FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# First, copy the automation package.json and install its dependencies
# This is necessary because the backend spawns playwright from the automation directory
COPY automation/package*.json ./automation/
RUN cd automation && npm install

# Copy the automation test code
COPY automation/ ./automation/

# Next, setup the backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Copy the backend source
COPY backend/ ./

# Expose API port
EXPOSE 5001

# Start the Node.js backend
CMD ["npm", "start"]
