import { SpotifyApi, type AccessToken } from "@spotify/web-api-ts-sdk";
import chalk from "chalk-template";

async function refreshToken(
  clientId: string,
  clientSecret: string,
  token: AccessToken
): Promise<AccessToken> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token.");
  }

  const newToken = (await response.json()) as AccessToken;

  newToken.expires = Date.now() + newToken.expires_in * 1000;
  newToken.refresh_token = token.refresh_token;

  return newToken;
}

async function withToken(
  clientId: string,
  clientSecret: string,
  file: string
): Promise<SpotifyApi> {
  let token = await Bun.file(file).json();

  if (Date.now() >= (token.expires ?? 0)) {
    token = await refreshToken(clientId, clientSecret, token);
    await Bun.write(file, JSON.stringify(token));
  }

  return SpotifyApi.withAccessToken(clientId, token);
}

async function withAuth(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  scopes: string[],
  file: string
): Promise<SpotifyApi> {
  const url = new URL("https://accounts.spotify.com/authorize");

  const state = Number(Math.random()).toString(36).substring(7);

  url.searchParams.append("client_id", clientId);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("scope", scopes.join(" "));
  url.searchParams.append("state", state);

  console.log(chalk`{bold Visit this URL to authenticate with Spotify:}`);
  console.log(url.href);

  return await new Promise((resolve) =>
    Bun.serve({
      port: 3000,
      fetch: async (request, server) => {
        const url = new URL(request.url);

        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");

          if (!code) {
            return new Response("No code provided.");
          }

          if (state !== state) {
            return new Response("Invalid state.");
          }

          const response = await fetch(
            "https://accounts.spotify.com/api/token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
              }),
            }
          );

          if (!response.ok) {
            return new Response("Failed to authenticate with Spotify.");
          }

          const token = (await response.json()) as AccessToken;

          token.expires = Date.now() + token.expires_in * 1000;

          await Bun.write(file, JSON.stringify(token));

          server
            .stop()
            .then(() => resolve(SpotifyApi.withAccessToken(clientId, token)));

          return new Response("You can close this tab now.");
        }

        return new Response("Not found.", { status: 404 });
      },
    })
  );
}

export async function createSpotify(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  scopes: string[],
  file: string
): Promise<SpotifyApi> {
  try {
    return await withToken(clientId, clientSecret, file);
  } catch {
    return await withAuth(clientId, clientSecret, redirectUri, scopes, file);
  }
}
