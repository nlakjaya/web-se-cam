import { Uploader } from "../../../ts/service/uploader";
import { Storage } from "../../../ts/service/storage";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const uploader = new Uploader("/dev/null");
  const storage = new Storage();

  uploader.updateOptions({ fallbackStorage: storage });
  await storage.init({
    browserStorage: { appName: "test", storeName: "blobs" },
  });

  await uploader.post("testFile", new Blob(["test1"], { type: "video/plain" }));
  console.log("Load 1", await storage.load("testFile"));
  await storage.delete("testFile");

  uploader.updateOptions({ url: "/upload" });
  await uploader.post(
    `testFile-${Date.now()}`,
    new Blob(["test2"], { type: "video/plain" }),
  );
  console.log("List", await storage.list());

  // uploader.updateOptions({ mode: "multipart/form-data" });
  // await uploader.post(`testFile-${Date.now()}`, new Blob(["test3"], { type: "video/plain" }));
  // console.log("List", await storage.list());

  await storage.clear();

  if (app) {
    app.textContent = "Test Completed" as string;
  }
}

happyPath();
