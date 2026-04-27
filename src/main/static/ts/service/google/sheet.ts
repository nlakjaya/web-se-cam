import { Logger } from "../../util/logger";
import { Google } from "../google";

const logger = new Logger("GoogleSheet");
export class GoogleSheet {
  constructor(private google: typeof Google) {
    logger.debug("instance created");
  }

  async read(sheetId: string, range: string): Promise<string[][]> {
    logger.debug("read called:", range);
    const token = await this.google.getToken();
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${token.bearer}` } },
    );
    if (response.status != 200) {
      throw new Error(`HTTP POST: ${response.status} ${response.statusText}`);
    }
    const responseJson = await response.json();
    logger.debug("read success:", range, responseJson);
    return responseJson.values;
  }

  async append(
    sheetId: string,
    range: string,
    values: (string | number | boolean | undefined)[][],
  ) {
    logger.debug("append called:", range, values);
    const token = await this.google.getToken();
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
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
  }
}
