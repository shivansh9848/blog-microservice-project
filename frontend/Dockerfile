# Use official Node.js image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy rest of the code
COPY . .

# Build Next.js app
RUN npm run build

# Expose app port
EXPOSE 3000

# Start app
CMD ["npm", "run", "dev"]
