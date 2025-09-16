# This is the newer version

FROM node:20-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install --no-package-lock

# Force reinstall esbuild to fix version mismatch
RUN npm rebuild esbuild

RUN npm i -g serve

COPY . .

RUN npm run build

EXPOSE 8080

CMD [ "serve", "-s", "dist" ]