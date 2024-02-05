FROM node:21.0.0-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install
RUN yarn add sharp --ignore-engines

COPY . .

RUN yarn build

CMD ["yarn", "start"]