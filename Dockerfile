FROM oven/bun:alpine AS base
WORKDIR /app

FROM base AS install
RUN mkdir -p /tmp/prod
COPY package.json bun.lockb /tmp/prod/
RUN cd /tmp/prod && bun install --from-lockfile --production

FROM base AS release
ENV TOKEN_FILE=/config/token.json

RUN apk --update add bash docker && rm -rf /var/cache/apk/*

COPY --from=install /tmp/prod/node_modules /app/node_modules
COPY . .

RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 3000/tcp
ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["bun", "run", "start"]
