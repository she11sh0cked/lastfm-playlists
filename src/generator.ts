import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import chalk from "chalk-template";

import type { Config } from "./config";

type Track = {
  artists: { name: string }[];
  name: string;
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

        const result = await this.spotify.search(
          `track:${track.name} ${track.artists
            .map((a) => `artist:${a.name}`)
            .join(" ")}`,
          ["track"]
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

  async create(
    username: Config["usernames"][number],
    type: Config["playlists"][number],
    amount?: Config["amount"]
  ): Promise<void> {
    const user = await this.spotify.currentUser.profile();
    const playlists = await this.spotify.playlists.getUsersPlaylists(user.id);
    const now = new Date().toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const playlistName = `${username}'s ${type}`;
    const description = `A playlist generated from ${username}'s ${type} station on Last.fm on ${now}`;

    console.log(chalk`{bold ${playlistName}}`);

    const tracks = await this.fetchTracks(username, type, amount);

    let playlist = playlists.items.find(
      (playlist) => playlist?.name === playlistName
    );

    if (playlist) {
      await this.spotify.playlists.changePlaylistDetails(playlist.id, {
        description,
      });

      if (playlist.tracks.total > 0) {
        const { items } = await this.spotify.playlists.getPlaylistItems(
          playlist.id
        );

        await this.spotify.playlists.removeItemsFromPlaylist(playlist.id, {
          tracks: items.map((t) => ({ uri: t.track.uri })),
        });
      }
    } else {
      playlist = await this.spotify.playlists.createPlaylist(user.id, {
        name: playlistName,
        description,
      });
    }

    await this.spotify.playlists.addItemsToPlaylist(playlist.id, tracks);
  }
}
