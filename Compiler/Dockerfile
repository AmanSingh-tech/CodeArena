FROM node:24-alpine3.21

# Toolchains for every language the judge accepts: C, C++, Python, Java (Node is the base image).
RUN apk add --no-cache g++ python3 openjdk17-jdk
ENV PATH="/usr/lib/jvm/default-jvm/bin:${PATH}"

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

ENV PORT=3002

# Submissions are untrusted code: never run them as root.
USER node

EXPOSE 3002

CMD ["node", "index.js"]
