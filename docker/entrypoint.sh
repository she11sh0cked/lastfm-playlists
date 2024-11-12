#!/usr/bin/env bash

if [ -n "$CRON" ]; then
    echo "$CRON cd /app && bun run start" | crontab -
    crond -f
else
    bun run start
fi
