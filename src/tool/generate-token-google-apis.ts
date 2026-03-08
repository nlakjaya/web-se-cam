#!/bin/npx ts-node
import * as path from "path";
import { authenticate } from "@google-cloud/local-auth";

async function printToken(keyfilePath: string, ...scopes: string[]) {
  console.error("Opening browser to authenticate...");
  const client = await authenticate({ keyfilePath, scopes });
  console.log(`GOOGLE_APIS_REFRESH_TOKEN=${client.credentials.refresh_token}`);
}

if (process.argv.length < 3) {
  console.error(`\
Usage: ${path.basename(__filename)} CLIENT_SECRET_JSON_FILE
`);
  process.exit(1);
}

printToken(process.argv[2], "https://www.googleapis.com/auth/drive");
