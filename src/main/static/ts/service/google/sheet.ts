import { Logger } from "../../util/logger";
import { GoogleClient } from "./client";

type Options = {
  gsiClient: GoogleClient;
  sheetId: string;
};

const logger = new Logger("GoogleSheet");
export class GoogleSheet {
  private options: Options;

  constructor(gsiClient: GoogleClient, sheetId: string) {
    this.options = { gsiClient, sheetId };

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };
  }

  async read(range: string): Promise<string[][]> {
    logger.debug("read called:", range);
    try {
      const token = await this.options.gsiClient.getToken();
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.options.sheetId}/values/${range}`,
        { headers: { Authorization: `Bearer ${token.bearer}` } },
      );
      if (response.status != 200) {
        throw new Error(`HTTP POST: ${response.status} ${response.statusText}`);
      }
      const responseJson = await response.json();
      logger.debug("read success:", range, responseJson);
      return responseJson.values;
    } catch (error) {
      logger.error("read failed:", range, error);
      throw error;
    }
  }

  async append(range: string, values: string[][]) {
    logger.debug("append called:", range, values);
    try {
      const token = await this.options.gsiClient.getToken();
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.options.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.bearer}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values,
          }),
        },
      );
      if (response.status != 200) {
        throw new Error(`HTTP POST: ${response.status} ${response.statusText}`);
      }
      logger.debug("append success:", range, await response.json());
    } catch (error) {
      logger.error("append failed:", range, error);
      throw error;
    }
  }
}
