# Use the official Node.js runtime as a parent image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Set environment variable for production
ENV NODE_ENV=production
ENV PORT=8080

# Define the command to run the application
CMD ["npm", "start"]
