import { Request, Response } from "express";
import * as fs from "fs";
import { dirname } from "path";

const STATS_FIELDS =
  process.env.STATS_FIELDS ||
  "deviceId,deviceTimestamp,batteryLevel,batteryCharging,batteryEta,frameCount,locationTimestamp,latitude,longitude,altitude";
const STATS_CSV_FILE_PATH =
  process.env.STATUS_CSV_FILE_PATH || "./data/device-status.csv";

async function initializeCsv() {
  if (!fs.existsSync(STATS_CSV_FILE_PATH)) {
    await fs.promises.mkdir(dirname(STATS_CSV_FILE_PATH), { recursive: true });
    await fs.promises.writeFile(
      STATS_CSV_FILE_PATH,
      `serverTimestamp,${STATS_FIELDS}\n`,
    );
  }
}

export function getHandlerStats() {
  const statFields = STATS_FIELDS.split(",");

  return async (req: Request, res: Response) => {
    const statsRecord = Object.fromEntries(
      statFields.map((field) =>
        req.body[field] !== undefined
          ? [field, req.body[field]]
          : [field, null],
      ),
    );
    const csvRow = Object.values(statsRecord).join(",");
    try {
      await initializeCsv();
      await fs.promises.appendFile(
        STATS_CSV_FILE_PATH,
        `${Date.now()},${csvRow}\n`,
      );
      console.log("stats recorded:", statsRecord);
      res
        .status(200)
        .json({ status: "success", received: Object.keys(statsRecord) });
    } catch (err) {
      console.error("Failed to write to CSV:", err);
      return res
        .status(500)
        .json({ status: "error", message: "Internal Server Error" });
    }
  };
}
