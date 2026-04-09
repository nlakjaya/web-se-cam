import { Uploader } from "../../../ts/service/uploader";
import { Storage } from "../../../ts/service/storage";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const uploader = new Uploader("/dev/null");
  const storage = new Storage();

  uploader.updateOptions({
    fallback: (filename: string, blob: Blob) => storage.save(filename, blob),
  });
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
  // console.log("List", await storage.list());

  // TODO: mode: "multipart/form-data
  // uploader.updateOptions({ mode: "multipart/form-data" });
  // await uploader.post(`testFile-${Date.now()}`, new Blob(["test3"], { type: "video/plain" }));

  const storageList = await storage.list();
  console.log("List", storageList);

  await storage.clear();

  if (app) {
    let status = "Test Completed";
    if (storageList.length) {
      status = "Test Failed (check backend logs)";
    }
    app.append(document.createTextNode(status));
  }
}

happyPath();
