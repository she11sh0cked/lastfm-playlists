export type LastFMSong = {
  url: string;
  duration: number;
  artists: Artist[];
  spelling_id: number;
  name: string;
  playlinks: Playlink[];
};

type Artist = {
  url: string;
  name: string;
};

type Playlink = {
  affiliate: string;
  id: string;
  url: string;
  source: string;
};

export type PlaylistType = "library" | "mix" | "recommended";

/**
 * Retrieves a playlist of songs from Last.fm for the specified user and type.
 * @param username The Last.fm username to retrieve the playlist for.
 * @param type The type of playlist to retrieve. Can be "library", "mix", or "recommended".
 * @param [amount] The maximum number of songs to retrieve. If not specified, whatever Last.fm returns will be returned.
 * @returns A Promise that resolves to an array of Song objects representing the retrieved playlist.
 */
export async function getPlaylist(
  username: string,
  type: PlaylistType,
  amount?: number
): Promise<LastFMSong[]> {
  const songs: Map<string, LastFMSong> = new Map();

  let page = 1;

  do {
    const { playlist } = await fetch(
      `https://www.last.fm/player/station/user/${username}/${type}?page=${page}`
    ).then((res) => res.json() as Promise<{ playlist: LastFMSong[] }>);

    for (const song of playlist) {
      songs.set(song.url, song);
    }

    page++;
  } while (songs.size < (amount ?? 0));

  return [...songs.values()].slice(0, amount);
}
