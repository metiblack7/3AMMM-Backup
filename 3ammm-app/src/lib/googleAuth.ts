import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Google OAuth implementation for React Native/Web
 * Uses authorization code flow
 */

// Generate a random string
function generateRandomString(length: number = 43): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get the redirect URL based on platform
function getRedirectUrl(): string {
  if (Platform.OS === "web") {
    // For web, use current origin
    return typeof window !== "undefined" ? window.location.origin + "/" : "http://localhost:8082/";
  }
  // For native, use custom scheme
  return "exp+saba://";
}

interface GoogleAuthResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  email: string;
  name: string;
}

export async function initiateGoogleAuth(clientId: string): Promise<GoogleAuthResponse | null> {
  try {
    const redirectUrl = getRedirectUrl();
    
    // Ensure redirectUrl is a string
    if (!redirectUrl || typeof redirectUrl !== "string") {
      throw new Error("Invalid redirect URL");
    }

    // Generate state for CSRF protection
    const state = generateRandomString(32);
    
    // Save state for later verification
    await AsyncStorage.setItem("google_auth_state", state);

    // Build authorization URL with valid string parameters
    const authParams: Record<string, string> = {
      client_id: String(clientId),
      redirect_uri: String(redirectUrl),
      response_type: "code",
      scope: "openid email profile",
      state: String(state),
      access_type: "offline",
    };

    const queryString = Object.entries(authParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${queryString}`;

    // Handle web platform
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.location.href = authUrl;
      }
      return null;
    }

    // For native, use WebBrowser
    WebBrowser.maybeCompleteAuthSession();
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    if (result.type === "success") {
      // Parse the redirect URL to get the authorization code
      try {
        const urlStr = result.url || "";
        const codeMatch = urlStr.match(/[?&]code=([^&]+)/);
        const stateMatch = urlStr.match(/[?&]state=([^&]+)/);
        const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;
        const returnedState = stateMatch ? decodeURIComponent(stateMatch[1]) : null;
        
        // Verify state matches to prevent CSRF
        const savedState = await AsyncStorage.getItem("google_auth_state");
        if (returnedState !== savedState) {
          throw new Error("State mismatch");
        }
        
        if (code) {
          return {
            access_token: code,
            token_type: "authorization_code",
            expires_in: 3600,
            email: "",
            name: "",
          };
        }
      } catch (parseErr) {
        console.error("Error parsing auth response:", parseErr);
        throw parseErr;
      }
    }
    
    return null;
  } catch (err) {
    console.error("Google auth error:", err);
    throw err;
  }
}

/**
 * Get user info from Google ID token (base64 decode)
 */
export async function getUserInfoFromIdToken(idToken: string): Promise<{ email: string; name: string }> {
  try {
    // Decode JWT token (ID token)
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    // Base64 decode (handle URL-safe base64)
    let decodedStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const decoded = JSON.parse(decodedStr);

    return {
      email: decoded.email,
      name: decoded.name,
    };
  } catch (err) {
    console.error("Error decoding ID token:", err);
    throw err;
  }
}
