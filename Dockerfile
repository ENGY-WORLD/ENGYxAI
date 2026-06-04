FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create session directory
RUN mkdir -p session

# Expose port (optional, for health checks)
EXPOSE 8080

# Start the bot
CMD ["npm", "start"]
