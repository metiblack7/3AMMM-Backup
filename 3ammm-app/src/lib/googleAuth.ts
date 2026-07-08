import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";

// Complete the auth session when returning from Google
WebBrowser.maybeCompleteAuthSession();

// ── Client IDs (same for dev and production) ──────────────────
export const ANDROID_CLIENT_ID =
  "991044441560-iop8dkjg2drcs0vi105fe8j2t71g6dc2.apps.googleusercontent.com";

export const WEB_CLIENT_ID =
  "991044441560-q9fc0fh9vjthgdu12a6mri50bgv2h178.apps.googleusercontent.com";

// ── Redirect URIs ──────────────────────────────────────────────
// For native apps (Android/iOS): uses the app's custom scheme
// For Web: uses Expo's auth.expo.io service
const redirectUri = makeRedirectUri({
  scheme: "com.ammm.worship",
  path: "oauthredirect",
  isTripleSlashed: true, // Important for proper URI format
});

// Exported for reference
export const GOOGLE_REDIRECT_URI = redirectUri;

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId:     WEB_CLIENT_ID,
    redirectUri:     redirectUri,
    scopes:          ["openid", "profile", "email"],
  });

  return { request, response, promptAsync };
}

// Fetch user info from Google using the access token
export async function fetchGoogleUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google user info");
  }

  const data = await response.json();
  return {
    id:          data.sub,
    email:       data.email,
    name:        data.name,
    picture:     data.picture,
    given_name:  data.given_name,
    family_name: data.family_name,
  };
}

// Handle the auth response and extract the access token
export function getAccessTokenFromResponse(response: any): string | null {
  if (response?.type === "success") {
    return response.authentication?.accessToken ?? null;
  }
  return null;
}