# Use an official Node.js runtime as a parent image
FROM node:14 AS build

# Set the working directory for the backend
WORKDIR /app/backend

# Copy the backend package.json and package-lock.json
COPY backend/package*.json ./

# Install the backend dependencies
RUN npm install

# Copy the backend source code
COPY backend/ .

# Build the backend
RUN npm run build

# Set up the working directory for the frontend
WORKDIR /app/frontend

# Copy the frontend package.json and package-lock.json
COPY frontend/package*.json ./

# Install the frontend dependencies
RUN npm install

# Copy the frontend source code
COPY frontend/ .

# Build the frontend
RUN npm run build

# Start application
CMD ["sh", "-c", "node /app/backend/dist/index.js & serve -s build -l 3000"]

# Expose ports for frontend and backend
EXPOSE 3000 3001
