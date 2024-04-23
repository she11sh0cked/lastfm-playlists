#!/usr/bin/env bash

if [ -z "$LASTFM_USERNAMES" ]; then
    echo "LASTFM_USERNAMES is not set. Exiting."
    exit 1
fi

if [ -z "$LASTFM_TYPES" ]; then
    echo "LASTFM_TYPES is not set. Exiting."
    exit 1
fi

if [ -z "$SPOTIFY_CLIENT_ID" ]; then
    echo "SPOTIFY_CLIENT_ID is not set. Exiting."
    exit 1
fi

if [ -z "$SPOTIFY_CLIENT_SECRET" ]; then
    echo "SPOTIFY_CLIENT_SECRET is not set. Exiting."
    exit 1
fi

if [ -n "$CRON" ]; then
    echo "$CRON cd /app && bun run start" | crontab -
    crond -f
else
    bun run start
fi
