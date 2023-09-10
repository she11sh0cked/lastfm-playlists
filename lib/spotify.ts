import SpotifyWebApi from "spotify-web-api-node";
import { logger } from "../utils/logger";

export const spotify = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

async function getAuthViaUrl() {
  const authUrl = spotify.createAuthorizeURL(
    [
      "playlist-read-private",
      "playlist-modify-private",
      "playlist-modify-public",
    ],
    "state"
  );

  logger.info("Please authorize the app by visiting this URL:");
  logger.info(authUrl);

  return await new Promise((resolve, reject) => {
    Bun.serve({
      port: 3000,
      async fetch(request, server) {
        const url = new URL(request.url);

        if (url.pathname !== "/callback") {
          return new Response("Not found", {
            status: 404,
          });
        }

        const error = url.searchParams.get("error");

        if (error != null) {
          reject(error);
          return new Response("Error authorizing app: " + error, {
            status: 500,
          });
        }

        const code = url.searchParams.get("code");

        if (code == null) {
          reject("No authorization code provided.");
          return new Response("No authorization code provided.", {
            status: 500,
          });
        }

        const data = await spotify.authorizationCodeGrant(code);

        spotify.setAccessToken(data.body.access_token);
        spotify.setRefreshToken(data.body.refresh_token);

        server.stop();
        resolve(data.body);

        return new Response("Authorized! You can close this tab now.", {
          status: 200,
        });
      },
    });
  });
}

async function getAuthViaFile(path: string) {
  const token = Bun.file(path);

  const data = await token.json();

  spotify.setAccessToken(data.access_token);
  spotify.setRefreshToken(data.refresh_token);

  return data;
}

export async function getAuth(path?: string) {
  if (!path) {
    return await getAuthViaUrl();
  }

  try {
    return await getAuthViaFile(path);
  } catch (err) {
    const data = await getAuthViaUrl();

    Bun.write(path, JSON.stringify(data));

    return data;
  }
}
