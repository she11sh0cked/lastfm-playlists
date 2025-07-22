import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import chalk from "chalk-template";

import type { Config } from "./config";
import { PersistentCache } from "./cache";
import { withRetry } from "./retry";

type Track = {
  artists: { name: string }[];
  name: string;
};

type PlaylistDetails = {
  name: string;
  description: string;
};

// Updated cache type to use PersistentCache
type SongCache = PersistentCache<string | null>;

export class PlaylistGenerator {
  constructor(private spotify: SpotifyApi) {}

  private async fetchTracks(
    username: Config["usernames"][number],
    type: Config["playlists"][number],
    amount?: Config["amount"],
    cache?: SongCache
  ): Promise<string[]> {
    const found = new Set<string>();
    const notFound = new Set<string>();

    // Initialize cache if not provided
    const songCache = cache || new PersistentCache<string | null>();

    for (let page = 1; found.size < (amount ?? 0); page++) {
      const response = await fetch(
        `https://www.last.fm/player/station/user/${username}/${type}?page=${page}`
      );

      if (!response.ok) {
        console.error(
          `Failed to fetch page ${page}: ${response.status} ${response.statusText}`
        );
        break;
      }

      let data;
      try {
        data = (await response.json()) as { playlist: Track[] };
      } catch (error) {
        console.error(`Failed to parse JSON response for page ${page}:`, error);
        break;
      }

      if (!data || !data.playlist || !Array.isArray(data.playlist)) {
        console.error(`Invalid response structure for page ${page}:`, data);
        break;
      }

      if (data.playlist.length === 0) {
        break; // No more tracks to fetch
      }

      for (const track of data.playlist) {
        if (found.size >= (amount ?? 0)) {
          break; // Reached the maximum number of tracks
        }

        const key = `${track.name} - ${track.artists
          .map((a) => a.name)
          .join(", ")}`;

        if (notFound.has(key)) {
          continue; // Skip tracks that were not found on Spotify
        }

        let uri: string | null = null;
        let fromCache = false;

        // Check if the track is in the cache
        if (songCache.has(key)) {
          uri = songCache.get(key) || null;
          fromCache = true;
        } else {
          const result = await withRetry(() =>
            this.spotify.search(
              `track:${track.name} ${track.artists
                .map((a) => `artist:${a.name}`)
                .join(" ")}`,
              ["track"]
            )
          );

          const wasFound = result.tracks.items.length > 0;
          uri = wasFound ? result.tracks.items[0].uri : null;

          // Store result in cache
          songCache.set(key, uri);
        }

        const wasFound = uri !== null;

        if (wasFound) {
          found.add(uri!);
        } else {
          notFound.add(key);
        }

        const number = (wasFound ? found.size.toString() : "").padStart(
          amount?.toString().length ?? 0
        );

        // Use a different color for cached songs
        console.log(
          chalk`{bold ${number}} {${
            fromCache ? "cyan" : wasFound ? "green" : "red"
          } ${key}}${fromCache ? chalk` {gray (cached)}` : ""}`
        );
      }
    }

    return Array.from(found).slice(0, amount);
  }

  private getFormattedTimestamp(): string {
    return new Date().toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  private async createOrUpdatePlaylist(
    details: PlaylistDetails,
    tracks: string[]
  ): Promise<void> {
    const user = await withRetry(() => this.spotify.currentUser.profile());
    const playlists = await withRetry(() =>
      this.spotify.playlists.getUsersPlaylists(user.id)
    );

    let playlist = playlists.items.find(
      (playlist) => playlist?.name === details.name
    );

    if (playlist) {
      await withRetry(() =>
        this.spotify.playlists.changePlaylistDetails(playlist!.id, {
          description: details.description,
        })
      );

      if (playlist.tracks.total > 0) {
        const { items } = await withRetry(() =>
          this.spotify.playlists.getPlaylistItems(playlist!.id)
        );

        await withRetry(() =>
          this.spotify.playlists.removeItemsFromPlaylist(playlist!.id, {
            tracks: items.map((t) => ({ uri: t.track.uri })),
          })
        );
      }
    } else {
      playlist = await withRetry(() =>
        this.spotify.playlists.createPlaylist(user.id, {
          name: details.name,
          description: details.description,
        })
      );
    }

    if (tracks.length > 0) {
      await withRetry(() =>
        this.spotify.playlists.addItemsToPlaylist(playlist.id, tracks)
      );
      console.log(
        chalk`{green Successfully updated playlist with ${tracks.length} tracks}`
      );
    } else {
      console.log(chalk`{yellow No tracks found for the playlist}`);
    }
  }

  async createSeperatePlaylists(
    username: Config["usernames"][number],
    type: Config["playlists"][number],
    amount?: Config["amount"],
    cache?: SongCache
  ): Promise<void> {
    const now = this.getFormattedTimestamp();
    const playlistName = `${username}'s ${type}`;
    const description = `A playlist generated from ${username}'s ${type} station on Last.fm on ${now}`;

    console.log(chalk`{bold ${playlistName}}`);

    const tracks = await this.fetchTracks(username, type, amount, cache);

    await this.createOrUpdatePlaylist(
      { name: playlistName, description },
      tracks
    );
  }

  async createBlendedPlaylist(
    usernames: Config["usernames"],
    type: Config["playlists"][number],
    amount?: Config["amount"],
    cache?: SongCache
  ): Promise<void> {
    if (usernames.length === 0) {
      console.log(
        chalk`{yellow No usernames provided, skipping blend playlist creation}`
      );
      return;
    }

    const now = this.getFormattedTimestamp();
    const usernamesList = usernames.join(" + ");
    const playlistName = `Blended ${type} - ${usernamesList}`;
    const description = `A blended playlist of ${type} tracks from ${usernamesList} on Last.fm, created on ${now}`;

    console.log(chalk`{bold Creating blended playlist: ${playlistName}}`);

    // Fetch tracks for each user
    const userTracks: Map<string, string[]> = new Map();
    for (const username of usernames) {
      console.log(chalk`{bold Fetching tracks for ${username}...}`);
      const tracks = await this.fetchTracks(
        username,
        type,
        amount ? Math.ceil(amount / usernames.length) : undefined,
        cache
      );
      userTracks.set(username, tracks);
    }

    // Interlace tracks from all users
    const blendedTracks: string[] = [];
    let allTracksExhausted = false;
    let index = 0;

    while (!allTracksExhausted && blendedTracks.length < (amount ?? Infinity)) {
      allTracksExhausted = true;

      for (const username of usernames) {
        const tracks = userTracks.get(username) ?? [];
        if (index < tracks.length) {
          blendedTracks.push(tracks[index]);
          allTracksExhausted = false;
        }
      }

      index++;
    }

    await this.createOrUpdatePlaylist(
      { name: playlistName, description },
      blendedTracks
    );
  }
}
