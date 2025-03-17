import convict from "convict";

const playlists = ["library", "mix", "recommended"] as const;

const coerceArray = (value: string) =>
  value.split(",").map((item) => item.trim());

convict.addFormat({
  name: "usernames",
  validate: (value: string[]) => {
    if (!Array.isArray(value)) {
      throw new Error("must be an array");
    }

    if (value.length === 0) {
      throw new Error("must not be empty");
    }

    for (const item of value) {
      if (typeof item !== "string") {
        throw new Error("must be a string");
      }
    }
  },
  coerce: coerceArray,
});

convict.addFormat({
  name: "playlists",
  validate: (value: string[]) => {
    if (!Array.isArray(value)) {
      throw new Error("must be an array");
    }

    if (value.length === 0) {
      throw new Error("must not be empty");
    }

    for (const item of value) {
      if (!playlists.includes(item as any)) {
        throw new Error(`must be one of: ${playlists.join(", ")}`);
      }
    }
  },
  coerce: coerceArray,
});

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
    format: "usernames",
    default: [] as string[],
    env: "LASTFM_USERNAMES",
  },
  playlists: {
    doc: "The Last.fm playlist types to retrieve.",
    format: "playlists",
    default: playlists,
    env: "LASTFM_PLAYLISTS",
  },
  amount: {
    doc: "The maximum number of songs to retrieve.",
    format: Number,
    default: 30,
    env: "AMOUNT",
  },
  enableBlend: {
    doc: "Whether to create blended playlists from all users' tracks.",
    format: Boolean,
    default: true,
    env: "ENABLE_BLEND",
  },
  enableSeperate: {
    doc: "Whether to create seperate playlists for each user.",
    format: Boolean,
    default: true,
    env: "ENABLE_SEPERATE",
  },
});

config.validate({ allowed: "strict" });

export { config };
export type Config = ReturnType<typeof config.getProperties>;
