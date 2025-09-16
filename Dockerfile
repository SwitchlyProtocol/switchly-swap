# This is the newer version

FROM node:20-alpine

WORKDIR /app

COPY package.json .

# Clean install without package-lock to get latest compatible versions
RUN npm install

# Force clean reinstall of problematic packages
RUN npm uninstall esbuild vite @vitejs/plugin-react-swc
RUN npm install esbuild@latest vite@latest @vitejs/plugin-react-swc@latest

RUN npm i -g serve

COPY . .

RUN npm run build

EXPOSE 8080

CMD [ "serve", "-s", "dist", "-l", "8080" ]