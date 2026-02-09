FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Compile contracts
RUN npx hardhat compile

# Expose Hardhat node port
EXPOSE 8545

# Default command: run Hardhat node
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
