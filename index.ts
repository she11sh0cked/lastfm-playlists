import { LastFMSong, PlaylistType, getPlaylist } from "./api/lastfm";
import { getAuth, spotify } from "./lib/spotify";
import { logger } from "./utils/logger";

async function createPlaylist({
  username,
  type,
  amount,
  playlistOpts = {},
}: {
  username: string;
  type: PlaylistType;
  amount: number;
  playlistOpts?: {
    name?: string;
    description?: string;
    public?: boolean;
  };
}): Promise<void> {
  playlistOpts.name ??= `${username}'s ${type}`;
  playlistOpts.description ??= `A playlist of ${type} songs from ${username}'s Last.fm library.`;
  playlistOpts.public ??= false;

  const songs = new Map<
    string,
    LastFMSong & { spotify: SpotifyApi.TrackObjectFull }
  >();

  do {
    const playlist = await getPlaylist(username, type);

    for (const song of playlist) {
      if (songs.size >= amount) break;
      if (songs.has(song.url)) continue;

      const spotifyTrack = await spotify
        .searchTracks(`track:${song.name} artist:${song.artists[0].name}`, {
          limit: 1,
        })
        .then((res) => res.body.tracks?.items[0]);

      if (spotifyTrack == null) continue;

      songs.set(song.url, { ...song, spotify: spotifyTrack });

      logger.info(
        "[%s/%s] %s - %s",
        songs.size.toString().padStart(amount.toString().length, " "),
        amount,
        song.artists[0].name,
        song.name
      );
    }
  } while (songs.size < amount);

  let playlistId: string | undefined;

  const playlists = await spotify.getUserPlaylists();

  for (const playlist of playlists.body.items) {
    if (playlist.name === playlistOpts.name) {
      playlistId = playlist.id;
      break;
    }
  }

  if (playlistId == null) {
    const playlist = await spotify.createPlaylist(playlistOpts.name, {
      description: playlistOpts.description,
    });
    playlistId = playlist.body.id;
  }

  const tracks = [...songs.values()].map((song) => song.spotify.uri);

  await spotify.replaceTracksInPlaylist(playlistId, tracks);
}

const USERNAMES = process.env.LASTFM_USERNAMES?.split(",") ?? [];
const TYPES = process.env.LASTFM_PLAYLISTS?.split(",") ?? [];
const AMOUNT = Number(process.env.AMOUNT ?? 30);

if (USERNAMES.length === 0) {
  logger.error("No Last.fm usernames specified.");
  process.exit(1);
}

if (TYPES.length === 0) {
  logger.error("No Last.fm playlist types specified.");
  process.exit(1);
}

if (isNaN(AMOUNT)) {
  logger.error("Amount is not a number.");
  process.exit(1);
}

await getAuth("token.json");

for (const username of USERNAMES) {
  for (const type of TYPES) {
    logger.info(
      "Creating %s playlist for %s with %d songs...",
      type,
      username,
      AMOUNT
    );

    await createPlaylist({
      username,
      type: type as PlaylistType,
      amount: AMOUNT,
    });
  }
}
