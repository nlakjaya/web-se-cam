#!/bin/npx ts-node
import dotenv from "dotenv";
dotenv.config();

import Google from "../main/service/google";

async function printRefreshToken() {
  const refreshToken = await Google.generateRefreshToken(
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
  );
  if (refreshToken) {
    console.log(
      `Update .env file with:\n\nGOOGLE_APIS_REFRESH_TOKEN=${refreshToken}\n`,
    );
  } else {
    console.error("ERROR: unable to get refresh token");
  }
}

printRefreshToken();
