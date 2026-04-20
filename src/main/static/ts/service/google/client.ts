import { Logger } from "../../util/logger";

const CONSENT_TOKEN_RENEW_DELAY_MS = 1000;

type Token = {
  bearer: string;
  expiry: number;
};

type Options = {
  clientId: string;
  scopes: ("drive" | "spreadsheets")[];
  login_hint?: string;
  token?: Token;
  renewTokenEvent?: (token: Token) => void;
};

const logger = new Logger("GoogleClient");
export class GoogleClient {
  private static noInitClient: boolean = true;

  static async initClient() {
    if (this.noInitClient) {
      const htmlHead = document.getElementsByTagName("head")[0];
      const scriptElement = document.createElement("script");
      scriptElement.src = "https://accounts.google.com/gsi/client";
      scriptElement.async = true;
      scriptElement.defer = true;
      htmlHead.append(scriptElement);

      this.noInitClient = false;
      return new Promise<void>((resolve, reject) => {
        scriptElement.onload = () => resolve();
        scriptElement.onerror = () =>
          reject(new Error(`Failed to load script: ${scriptElement.src}`));
      });
    }
  }

  private options: Options;

  constructor(clientId: string, scopes: Options["scopes"]) {
    this.options = { clientId, scopes };

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };
  }

  async getToken(): Promise<Token> {
    logger.debug("getToken called");
    if (!(this.options.token && this.options.token.expiry > Date.now())) {
      this.options.token = await this.renewAccessToken();
      this.options.renewTokenEvent?.(this.options.token);
    }
    return this.options.token;
  }

  private async renewAccessToken(prompt = "none"): Promise<Token> {
    logger.debug("renewAccessToken called");
    await GoogleClient.initClient();
    return new Promise<Token>((resolve, reject) => {
      const tokenClient = (
        window as any
      ).google.accounts.oauth2.initTokenClient({
        client_id: this.options.clientId,
        scope: this.options.scopes
          .map((scope) => `https://www.googleapis.com/auth/${scope}`)
          .join(" "),
        callback: (response: any) => {
          if (response.access_token) {
            logger.debug(
              "google.accounts.oauth2.initTokenClient callback:",
              response,
            );
            const token = {
              bearer: response.access_token,
              expiry: Date.now() + (parseInt(response.expires_in) - 60) * 1000,
            };
            resolve(token);
          } else if (response.error == "interaction_required") {
            setTimeout(() => {
              this.renewAccessToken("consent").then(resolve).catch(reject);
            }, CONSENT_TOKEN_RENEW_DELAY_MS);
          } else {
            const errorMsg = "could not retreive access_token";
            logger.error(errorMsg, response);
            reject(new Error(errorMsg));
          }
        },
      });
      tokenClient.requestAccessToken({
        prompt,
        login_hint: this.options.login_hint,
      });
    });
  }
}
