# LastFM Playlist Generator

This application generates Spotify playlists based on Last.fm data. It uses undocumented Last.fm API endpoints to fetch the library, mix, and recommended tracks for a user and adds them to a Spotify playlist.

## Docker

To help you get started creating a container from this image you can either use docker-compose or the docker cli.

### docker-compose (recommended)

```yaml
---
services:
  lastfm-playlists:
    image: ghcr.io/she11sh0cked/lastfm-playlists:latest
    container_name: lastfm-playlists
    environment:
      - LASTFM_USERNAMES=she11sh0cked
      - LASTFM_PLAYLISTS=library,mix,recommended
      - AMOUNT=100
      - SPOTIFY_CLIENT_ID=your-client-id
      - SPOTIFY_CLIENT_SECRET=your-client-secret
      - SPOTIFY_REDIRECT_URI=your-redirect-uri
    volumes:
      - /path/to/lastfm-playlists/config:/config
    ports:
      - 3000:3000

  # (Optional) Add a cron job to restart the container every day at midnight.
  cron:
    image: alpine:latest
    command: sh -c "apk add --no-cache docker-cli && echo '0 0 * * * docker start lastfm-playlists' > /etc/crontabs/root && crond -f"
    environment:
      - TZ=Etc/UTC
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
```

### docker cli

```bash
docker run -d \
  --name=lastfm-playlists \
  -e LASTFM_USERNAMES=she11sh0cked \
  -e LASTFM_PLAYLISTS=library,mix,recommended \
  -e AMOUNT=100 \
  -e SPOTIFY_CLIENT_ID=your-client-id \
  -e SPOTIFY_CLIENT_SECRET=your-client-secret \
  -e SPOTIFY_REDIRECT_URI=your-redirect-uri \
  -p 3000:3000 \
  -v /path/to/lastfm-playlists/config:/config \
  --restart unless-stopped \
  ghcr.io/she11sh0cked/lastfm-playlists:latest
```

## Parameters

| Parameter                                     | Function                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `-p 3000`                                     | The port for the spotify callback.                                        |
| `-e LASTFM_USERNAMES=USERNAME`                | Your Last.fm username or a comma separated list of usernames.             |
| `-e LASTFM_PLAYLISTS=mix,library,recommended` | The playlists to create. Available: mix, library, recommended.            |
| `-e AMOUNT=100`                               | The amount of songs to add to the playlists.                              |
| `-e SPOTIFY_CLIENT_ID=CLIENT_ID`              | Your Spotify client ID.                                                   |
| `-e SPOTIFY_CLIENT_SECRET=CLIENT_SECRET`      | Your Spotify client secret.                                               |
| `-e SPOTIFY_REDIRECT_URI=REDIRECT_URI`        | Your Spotify redirect URI.                                                |
| `-e TOKEN=token.json`                         | The token file to store the Spotify token. Default: `/config/token.json`. |
| `-v /config`                                  | Persistent storage for the token file.                                    |

## Running locally

1. Clone the repository.
2. Install the dependencies with `bun install`.
3. Copy the `.env.example` file to `.env` and fill in the required information.
4. Run the application with `bun start`.
