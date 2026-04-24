#!/bin/npx ts-node
import dotenv from "dotenv";
dotenv.config();

import Google from "../main/service/google";

async function printStats() {
  const sheetId = process.env.GOOGLE_SHEETS_STATS_ID;
  if (sheetId) {
    const values = await Google.Sheet.read(sheetId, "Stats!A1:I");
    console.log(values);
  }
}

printStats();
