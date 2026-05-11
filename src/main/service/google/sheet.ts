import { google, sheets_v4 } from "googleapis";
import { GoogleClass } from "./types";

export class Sheet {
  constructor(private google: GoogleClass) {}

  private async getSheets(): Promise<sheets_v4.Sheets> {
    const auth = await this.google.getAuthorization();
    return google.sheets({ version: "v4", auth });
  }

  async read(spreadsheetId: string, range: string): Promise<any[][]> {
    const sheets = await this.getSheets();
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      return response.data.values || [];
    } catch (error) {
      console.error("Google Sheets:", "Read Error:", error);
      throw error;
    }
  }

  async write(
    spreadsheetId: string,
    range: string,
    values: any[][],
  ): Promise<void> {
    const sheets = await this.getSheets();
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error("Google Sheets:", "Write Error:", error);
      throw error;
    }
  }

  async append(
    spreadsheetId: string,
    range: string,
    values: any[][],
  ): Promise<void> {
    const sheets = await this.getSheets();
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error("Google Sheets:", "Append Error:", error);
      throw error;
    }
  }
}
