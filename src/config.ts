import convict from "convict";

const config = convict({
  spotify: {
    clientId: {
      doc: "The Spotify client ID.",
      format: String,
      default: null,
      env: "SPOTIFY_CLIENT_ID",
    } as convict.SchemaObj<string>,
    clientSecret: {
      doc: "The Spotify client secret.",
      format: String,
      default: null,
      env: "SPOTIFY_CLIENT_SECRET",
    } as convict.SchemaObj<string>,
    redirectUri: {
      doc: "The Spotify redirect URI.",
      format: String,
      default: "http://localhost:3000/callback",
      env: "SPOTIFY_REDIRECT_URI",
    },
    scopes: {
      doc: "The Spotify scopes to request.",
      format: Array,
      default: [
        "playlist-read-private",
        "playlist-modify-private",
        "playlist-modify-public",
      ] as string[],
      env: "SPOTIFY_SCOPES",
    },
    tokenFile: {
      doc: "The Spotify token file.",
      format: String,
      default: "token.json",
      env: "SPOTIFY_TOKEN_FILE",
    },
  },
  usernames: {
    doc: "The Last.fm usernames to retrieve playlists for.",
    format: Array,
    default: [],
    env: "LASTFM_USERNAMES",
  },
  playlists: {
    doc: "The Last.fm playlist types to retrieve.",
    format: Array,
    default: ["library", "mix", "recommended"] as const,
    env: "LASTFM_PLAYLISTS",
  },
  amount: {
    doc: "The maximum number of songs to retrieve.",
    format: Number,
    default: 30,
    env: "AMOUNT",
  },
});

config.validate({ allowed: "strict" });

export { config };
