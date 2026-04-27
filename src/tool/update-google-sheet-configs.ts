#!/bin/npx ts-node
import dotenv from "dotenv";
dotenv.config();

import { App } from "../main/static/ts/app";
import Google from "../main/service/google";

const GOOGLE_SHEETS_CONFIGS_ID = process.env.GOOGLE_SHEETS_CONFIGS_ID;
if (!GOOGLE_SHEETS_CONFIGS_ID) {
  throw new Error("GOOGLE_SHEETS_CONFIGS_ID: undefined");
}

import { deviceConfigs } from "../../local/device-configs";

export type GoogleSheetConfig = {
  googleDriveUpload?: { enabled: boolean; parents: string[] };
  googleSheetStats?: { id: string; range: string };
  appOptions: Parameters<App["updateOptions"]>[0];
  activateOptions: Omit<Parameters<App["activate"]>[0], "deviceId">;
};

function toKv(obj: any): string[][] {
  const kv: string[][] = [];
  Object.entries(obj).forEach(([k, v]) =>
    typeof v != "object" || Array.isArray(v) || Object.keys(v ?? {}).length == 0
      ? kv.push([k, JSON.stringify(v)])
      : kv.push(...toKv(v).map(([innerK, v]) => [`${k}.${innerK}`, v])),
  );
  return kv;
}

async function updateGoogleSheetConfigs(configs: typeof deviceConfigs) {
  const deviceValues = Object.entries(deviceConfigs)
    .map<[string, GoogleSheetConfig]>(([device, config]) => [
      device,
      config.googleSheetConfig,
    ])
    .map<[string, string[][]]>(([device, config]) => [
      device,
      toKv({
        appOptions: config.appOptions,
        activateOptions: {
          deviceId: device,
          ...config.activateOptions,
        },
        googleDriveUpload: config.googleDriveUpload,
        googleSheetStats: config.googleSheetStats,
      }),
    ]);

  for (const [device, values] of deviceValues) {
    await Google.Sheet.write(
      GOOGLE_SHEETS_CONFIGS_ID as string,
      `${device}!A2`,
      values,
    );
  }
}

updateGoogleSheetConfigs(deviceConfigs)
  .then(() => console.log("Google Sheet: configs updated"))
  .catch((error) =>
    console.error("Google Sheet: configs update failed:", error),
  );
