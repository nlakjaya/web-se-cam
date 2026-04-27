import { Google } from "../../../ts/service/google";
import { sleep } from "../../ts/base";

// Important: Fill these before testing
const clientId = "";
const login_hint = "";
const googleDriveUploadParents: string[] = [];

const app = document.getElementById("app");

async function happyPath() {
  Google.updateOptions({
    clientId,
    scopes: ["drive"],
    login_hint,
    renewTokenEvent: (token: any) => {
      console.log("token:", token);
    },
  });

  await Google.Drive.upload(
    "google-drive-test-file",
    new Blob(["test"], { type: "video/plain" }),
    ...googleDriveUploadParents,
  );

  if (app) {
    app.append(document.createTextNode("Test Completed"));
  }
}

happyPath();
