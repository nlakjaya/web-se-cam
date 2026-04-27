import { Google } from "../../../ts/service/google";
import { sleep } from "../../ts/base";

// Important: Fill these before testing
const clientId = "";
const login_hint = "";
const googleSheetId = "";
const googleSheetReadRange = "test!A1:B";
const googleSheetAppendRange = "test!A1";

const app = document.getElementById("app");

async function happyPath() {
  Google.updateOptions({
    clientId,
    scopes: ["spreadsheets"],
    login_hint,
    renewTokenEvent: (token: any) => {
      console.log("token:", token);
    },
  });

  await Google.Sheet.append(googleSheetId, googleSheetAppendRange, [
    ["test", `test-${Math.round(Math.random() * 1000)}`],
  ]);

  const readValues = await Google.Sheet.read(
    googleSheetId,
    googleSheetReadRange,
  );
  console.log(readValues);

  if (app) {
    app.append(document.createTextNode("Test Completed"));
  }
}

happyPath();
