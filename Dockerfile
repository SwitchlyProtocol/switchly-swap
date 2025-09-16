# This is the newer version

FROM node:20-alpine

WORKDIR /app

# Accept build arguments from DigitalOcean
ARG VITE_ETHEREUM_RPC_URL
ARG VITE_SWITCHLY_API_BASE_URL
ARG VITE_SWITCHLY_MIDGARD_BASE_URL
ARG VITE_STELLAR_HORIZON_URL
ARG VITE_STELLAR_SOROBAN_URL
ARG VITE_SWITCHLY_SERVICE_WS

# Set environment variables for the build process
ENV VITE_ETHEREUM_RPC_URL=$VITE_ETHEREUM_RPC_URL
ENV VITE_SWITCHLY_API_BASE_URL=$VITE_SWITCHLY_API_BASE_URL
ENV VITE_SWITCHLY_MIDGARD_BASE_URL=$VITE_SWITCHLY_MIDGARD_BASE_URL
ENV VITE_STELLAR_HORIZON_URL=$VITE_STELLAR_HORIZON_URL
ENV VITE_STELLAR_SOROBAN_URL=$VITE_STELLAR_SOROBAN_URL
ENV VITE_SWITCHLY_SERVICE_WS=$VITE_SWITCHLY_SERVICE_WS

COPY package.json .

# Clean install without package-lock to get latest compatible versions
RUN npm install

# Force clean reinstall of problematic packages
RUN npm uninstall esbuild vite @vitejs/plugin-react-swc
RUN npm install esbuild@latest vite@latest @vitejs/plugin-react-swc@latest

RUN npm i -g serve

COPY . .

# Build with environment variables available
# If ARG/ENV approach fails, use the build script as fallback
RUN chmod +x build-with-env.sh && ./build-with-env.sh

EXPOSE 8080

CMD [ "serve", "-s", "dist", "-l", "8080" ]