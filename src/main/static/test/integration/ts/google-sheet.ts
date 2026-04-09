import { GoogleClient } from "../../../ts/service/google/client";
import { GoogleSheet } from "../../../ts/service/google/sheet";
import { sleep } from "../../ts/base";

// Important: Fill these before testing
const gsiClientId = "";
const login_hint = "";
const googleSheetId = "";
const googleSheetReadRange = "Sheet1!A1:B";
const googleSheetAppendRange = "Sheet1!A1";

const app = document.getElementById("app");

async function happyPath() {
  const gsiClient = new GoogleClient(gsiClientId, ["spreadsheets"]);
  gsiClient.updateOptions({
    login_hint,
    renewTokenEvent: (token) => {
      console.log("token:", token);
    },
  });

  (window as any).gsiClient = gsiClient; // for debugging

  const sheet = new GoogleSheet(gsiClient, googleSheetId);

  await sheet.append(googleSheetAppendRange, [
    ["test", `test-${Math.round(Math.random() * 1000)}`],
  ]);

  const readValues = await sheet.read(googleSheetReadRange);
  console.log(readValues);

  if (app) {
    app.append(document.createTextNode("Test Completed"));
  }
}

happyPath();
