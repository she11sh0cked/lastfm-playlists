import { config } from "./config";
import { PlaylistGenerator } from "./generator";
import { createSpotify } from "./spotify";

const spotify = await createSpotify(
  config.get("spotify.clientId"),
  config.get("spotify.clientSecret"),
  config.get("spotify.redirectUri"),
  config.get("spotify.scopes"),
  config.get("spotify.tokenFile")
);

const generator = new PlaylistGenerator(spotify);

// Create a cache to store Spotify song lookups across playlist generations
const songCache = new Map<string, string | null>();

if (config.get("enableSeperate")) {
  // Create individual playlists for each user
  for await (const username of config.get("usernames")) {
    for await (const playlist of config.get("playlists")) {
      await generator.createSeperatePlaylists(
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
