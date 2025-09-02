import { config } from "./config";
import { PlaylistGenerator } from "./generator";
import { createSpotify } from "./spotify";
import { PersistentCache } from "./cache";

const spotify = await createSpotify(
  config.get("spotify.clientId"),
  config.get("spotify.clientSecret"),
  config.get("spotify.redirectUri"),
  config.get("spotify.scopes"),
  config.get("spotify.tokenFile")
);

const generator = new PlaylistGenerator(spotify);

// Create a persistent cache to store Spotify song lookups
const songCache = new PersistentCache<string | null>(
  config.get("cache.file"),
  config.get("cache.maxSize")
);

if (config.get("enableSeparate")) {
  // Create individual playlists for each user
  for await (const username of config.get("usernames")) {
    for await (const playlist of config.get("playlists")) {
      await generator.createSeparatePlaylists(
        username,
        playlist,
        config.get("amount"),
        songCache
      );
    }
  }
}

if (config.get("enableBlend")) {
  // Create blended playlists that interlace songs from all users if enabled
  for await (const playlist of config.get("playlists")) {
    await generator.createBlendedPlaylist(
      config.get("usernames"),
      playlist,
      config.get("amount"),
      songCache
    );
  }
}

// Save cache to disk if needed
await songCache.saveToFile();
