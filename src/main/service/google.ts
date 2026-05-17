import * as fs from "node:fs";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

import { Drive } from "./google/drive";
import { Sheet } from "./google/sheet";

const GOOGLE_APIS_CREDENTIALS_FILE = process.env.GOOGLE_APIS_CREDENTIALS_FILE;
const GOOGLE_APIS_REFRESH_TOKEN = process.env.GOOGLE_APIS_REFRESH_TOKEN;

class Google {
  private auth?: OAuth2Client;

  public readonly Drive = new Drive(this);
  public readonly Sheet = new Sheet(this);

  async generateRefreshToken(...scopes: string[]): Promise<string | undefined> {
    if (!(GOOGLE_APIS_CREDENTIALS_FILE && GOOGLE_APIS_REFRESH_TOKEN)) {
      return;
    }

    console.info("Opening browser to authenticate...");
    const client = await authenticate({
      keyfilePath: GOOGLE_APIS_CREDENTIALS_FILE,
      scopes,
    });
    return client.credentials.refresh_token as string;
  }

  async getAuthorization(): Promise<OAuth2Client | undefined> {
    if (!(GOOGLE_APIS_CREDENTIALS_FILE && GOOGLE_APIS_REFRESH_TOKEN)) {
      return;
    }
    if (this.auth) {
      return this.auth;
    }

    const credentials = await fs.promises.readFile(
      GOOGLE_APIS_CREDENTIALS_FILE,
    );
    const keys = JSON.parse(credentials.toString());
    const auth = new google.auth.OAuth2(
      keys.installed.client_id,
      keys.installed.client_secret,
      keys.installed.redirect_uris[0],
    );
    auth.on("tokens", (tokens) =>
      console.debug("Google APIs: Token refreshed"),
    );
    auth.setCredentials({ refresh_token: GOOGLE_APIS_REFRESH_TOKEN });
    this.auth = auth;

    return auth;
  }
}

export default new Google();
