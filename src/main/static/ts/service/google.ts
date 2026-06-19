import { Logger } from "../util/logger";
import { GoogleDrive } from "./google/drive";
import { GoogleSheet } from "./google/sheet";
import { GoogleToken as Token } from "./google/types";

const TOKEN_RENEW_WITH_CONSENT_DELAY_MS = 1000;

type Options = {
  scopes?: ("drive" | "spreadsheets")[];
  clientId?: string;
  login_hint?: string;
  token?: Token;
  prompt?: "none" | "consent";
  renewTokenEvent?: (token: Token) => void;
};

const logger = new Logger("GoogleClient");
class GoogleClient {
  private initPromise?: Promise<void>;
  private options: Options;
  private renewingAccessToken?: boolean;

  public readonly Drive: GoogleDrive;
  public readonly Sheet: GoogleSheet;

  constructor() {
    this.options = {};

    const htmlHead = document.getElementsByTagName("head")[0];
    const scriptElement = document.createElement("script");
    scriptElement.src = "https://accounts.google.com/gsi/client";
    scriptElement.async = true;
    scriptElement.defer = true;
    htmlHead.append(scriptElement);
    this.initPromise = new Promise<void>((resolve, reject) => {
      scriptElement.onload = () => resolve();
      scriptElement.onerror = () =>
        reject(new Error(`Failed to load script: ${scriptElement.src}`));
    });

    this.Drive = new GoogleDrive(this);
    this.Sheet = new GoogleSheet(this);

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
      if (this.renewingAccessToken) {
        const errorMsg = "access_token is being renewed";
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      this.renewingAccessToken = true;
      try {
        this.options.token = await this.renewAccessToken();
      } finally {
        this.renewingAccessToken = false;
      }
      this.options.renewTokenEvent?.(this.options.token);
    }
    return this.options.token;
  }

  private async renewAccessToken(): Promise<Token> {
    logger.debug("renewAccessToken called");
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = undefined;
    }
    return new Promise<Token>((resolve, reject) => {
      const retryWithConsent = () =>
        setTimeout(() => {
          this.options.prompt = "consent";
          this.renewAccessToken().then(resolve).catch(reject);
        }, TOKEN_RENEW_WITH_CONSENT_DELAY_MS);
      const tokenClient = (
        globalThis as any
      ).google.accounts.oauth2.initTokenClient({
        client_id: this.options.clientId,
        scope: this.options.scopes
          ?.map((scope) => `https://www.googleapis.com/auth/${scope}`)
          .join(" "),
        callback: (response: any) => {
          if (response.access_token) {
            logger.debug(
              "google.accounts.oauth2.initTokenClient callback:",
              response,
            );
            const token = {
              bearer: response.access_token,
              expiry:
                Date.now() + (Number.parseInt(response.expires_in) - 60) * 1000,
            };
            this.options.prompt = "none";
            return resolve(token);
          }
          if (
            response.error == "interaction_required" &&
            this.options.prompt === undefined
          ) {
            logger.debug("interaction_required: retrying with consent");
            return retryWithConsent();
          }
          const errorMsg = "could not retreive access_token";
          logger.error(errorMsg, response);
          return reject(new Error(errorMsg));
        },
        error_callback: (error: any) => {
          if (this.options.prompt === undefined) {
            logger.debug("error_callback: retrying with consent");
            return retryWithConsent();
          }
          const errorMsg = "error in authentication";
          logger.error(errorMsg, error);
          return reject(new Error(errorMsg));
        },
      });
      tokenClient.requestAccessToken({
        prompt: this.options.prompt ?? "none",
        login_hint: this.options.login_hint,
      });
    });
  }
}

export const Google = new GoogleClient();
