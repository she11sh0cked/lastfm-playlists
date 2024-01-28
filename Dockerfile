FROM oven/bun

ENV TOKEN_FILE=/config/token.json

WORKDIR /app

COPY . /app

RUN bun install

CMD ["bun", "start"]
