ARG NODE_VERSION=18.19.1

FROM node:${NODE_VERSION}-alpine as builder
LABEL fly_launch_runtime="NodeJS"
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --production

FROM node:${NODE_VERSION}-alpine as runner
WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY ./dist/ /app/dist/
COPY package*.json ./
CMD [ "npm", "run", "start:prod" ]
