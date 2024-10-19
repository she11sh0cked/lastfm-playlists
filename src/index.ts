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

for await (const username of config.get("usernames")) {
  for await (const playlist of config.get("playlists")) {
    await generator.create(username, playlist, config.get("amount"));
  }
}
