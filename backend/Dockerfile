FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production

EXPOSE 10000

CMD ["npm", "start"]