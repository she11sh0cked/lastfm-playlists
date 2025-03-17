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
      - CRON=0 0 * * * # optional: run the application on a schedule
      - LASTFM_USERNAMES=she11sh0cked
      - LASTFM_PLAYLISTS=library,mix,recommended
      - AMOUNT=100
      - ENABLE_BLENDED=true
      - ENEABLE_SEPARATE=true
      - SPOTIFY_CLIENT_ID=your-client-id
      - SPOTIFY_CLIENT_SECRET=your-client-secret
      - SPOTIFY_REDIRECT_URI=your-redirect-uri
    volumes:
      - /path/to/lastfm-playlists/config:/config
    ports:
      - 3000:3000
```

### docker cli

```bash
docker run -d \
  --name=lastfm-playlists \
  -e LASTFM_USERNAMES=she11sh0cked \
  -e LASTFM_PLAYLISTS=library,mix,recommended \
  -e AMOUNT=100 \
  -e ENABLE_BLENDED=true \
  -e ENABLE_SEPARATE=true \
  -e SPOTIFY_CLIENT_ID=your-client-id \
  -e SPOTIFY_CLIENT_SECRET=your-client-secret \
  -e SPOTIFY_REDIRECT_URI=your-redirect-uri \
  -p 3000:3000 \
  -v /path/to/lastfm-playlists/config:/config \
  --restart unless-stopped \
  ghcr.io/she11sh0cked/lastfm-playlists:latest
```

## Parameters

| Parameter                                     | Function                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `-p 3000`                                     | The port for the spotify callback.                                               |
| `-e CRON=0 0 * * *`                           | The cron schedule to run the application. If not set, the application runs once. |
| `-e LASTFM_USERNAMES=USERNAME`                | Your Last.fm username or a comma separated list of usernames.                    |
| `-e LASTFM_PLAYLISTS=mix,library,recommended` | The playlists to create. Available: mix, library, recommended.                   |
| `-e AMOUNT=100`                               | The amount of songs to add to the playlists.                                     |
| `-e ENABLE_BLENDED=true`                      | Whether to create blended playlists from all users' tracks.                      |
| `-e ENABLE_SEPARATE=true`                     | Whether to create seperate playlists for each user.                              |
| `-e SPOTIFY_CLIENT_ID=CLIENT_ID`              | Your Spotify client ID.                                                          |
| `-e SPOTIFY_CLIENT_SECRET=CLIENT_SECRET`      | Your Spotify client secret.                                                      |
| `-e SPOTIFY_REDIRECT_URI=REDIRECT_URI`        | Your Spotify redirect URI.                                                       |
| `-e SPOTIFY_TOKEN_FILE=/config/token.json`    | The token file to store the Spotify token.                                       |
| `-v /config`                                  | Persistent storage for the token file.                                           |

## Running locally

1. Clone the repository.
2. Install the dependencies with `bun install`.
3. Create a `.env` file with the required environment variables.
4. Run the application with `bun start`.

> Note: The Spotify token will be stored in the root of the project as `token.json` by default.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
