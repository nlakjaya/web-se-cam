import { GoogleClient } from "../../../ts/service/google/client";
import { GoogleDrive } from "../../../ts/service/google/drive";
import { sleep } from "../../ts/base";

// Important: Fill these before testing
const gsiClientId = "";
const login_hint = "";
const googleDriveFolderId = "";

const app = document.getElementById("app");

async function happyPath() {
  const gsiClient = new GoogleClient(gsiClientId, ["drive"]);
  gsiClient.updateOptions({
    login_hint,
    renewTokenEvent: (token: any) => {
      console.log("token:", token);
    },
  });

  (window as any).gsiClient = gsiClient; // for debugging

  const drive = new GoogleDrive(gsiClient);
  drive.updateOptions({
    parents: [googleDriveFolderId],
  });
  await drive.upload(
    "google-drive-test-file",
    new Blob(["test"], { type: "video/plain" }),
  );

  if (app) {
    app.append(document.createTextNode("Test Completed"));
  }
}

happyPath();
