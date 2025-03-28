import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import chalk from "chalk-template";

import type { Config } from "./config";
import { withRetry } from "./retry";

type Track = {
  artists: { name: string }[];
  name: string;
};

type PlaylistDetails = {
  name: string;
  description: string;
};

export class PlaylistGenerator {
  constructor(private spotify: SpotifyApi) {}

  private async fetchTracks(
    username: Config["usernames"][number],
    type: Config["playlists"][number],
    amount?: Config["amount"]
  ): Promise<string[]> {
    const found = new Set<string>();
    const notFound = new Set<string>();

    for (let page = 1; found.size < (amount ?? 0); page++) {
      const data = await fetch(
        `https://www.last.fm/player/station/user/${username}/${type}?page=${page}`
      ).then((res) => res.json() as Promise<{ playlist: Track[] }>);

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

        const result = await withRetry(() =>
          this.spotify.search(
            `track:${track.name} ${track.artists
              .map((a) => `artist:${a.name}`)
              .join(" ")}`,
            ["track"]
          )
        );

        const wasFound = result.tracks.items.length > 0;

        if (wasFound) {
          found.add(result.tracks.items[0].uri);
        } else {
          notFound.add(key);
        }

        const number = (wasFound ? found.size.toString() : "").padStart(
          amount?.toString().length ?? 0
        );

        console.log(
          chalk`{bold ${number}} {${wasFound ? "green" : "red"} ${key}}`
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
    amount?: Config["amount"]
  ): Promise<void> {
    const now = this.getFormattedTimestamp();
    const playlistName = `${username}'s ${type}`;
    const description = `A playlist generated from ${username}'s ${type} station on Last.fm on ${now}`;

    console.log(chalk`{bold ${playlistName}}`);

    const tracks = await this.fetchTracks(username, type, amount);

    await this.createOrUpdatePlaylist(
      { name: playlistName, description },
      tracks
    );
  }

  async createBlendedPlaylist(
    usernames: Config["usernames"],
    type: Config["playlists"][number],
    amount?: Config["amount"]
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
        amount ? Math.ceil(amount / usernames.length) : undefined
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
