FROM oven/bun:alpine as base
WORKDIR /app

FROM base as install
RUN mkdir -p /tmp/prod
COPY package.json bun.lockb /tmp/prod/
RUN cd /tmp/prod && bun install --from-lockfile --production

FROM base as release
ENV TOKEN_FILE=/config/token.json

COPY --from=install /tmp/prod/node_modules /app/node_modules
COPY . .

EXPOSE 3000/tcp
CMD ["bun", "run", "start"]
