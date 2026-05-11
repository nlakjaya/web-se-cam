import { OAuth2Client } from "google-auth-library";

export type GoogleClass = {
  generateRefreshToken: (...scopes: string[]) => Promise<string | undefined>;
  getAuthorization: () => Promise<OAuth2Client | undefined>;
};
