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

if (config.get("enableSeperate")) {
  // Create individual playlists for each user
  for await (const username of config.get("usernames")) {
    for await (const playlist of config.get("playlists")) {
      await generator.createSeperatePlaylists(
        username,
        playlist,
        config.get("amount")
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
      config.get("amount")
    );
  }
}
