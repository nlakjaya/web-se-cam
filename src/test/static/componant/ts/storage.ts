import { Storage } from "../../../ts/service/storage";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const storage = new Storage();
  await storage.init({
    browserStorage: { appName: "test", storeName: "blobs" },
  });

  await storage.save("testFile1", new Blob(["test1"], { type: "text/plain" }));
  console.log("List", await storage.list());
  await storage.save("testFile2", new Blob(["test2"], { type: "text/plain" }));
  console.log("List", await storage.list());
  console.log("Load 1", await storage.load("testFile1"));
  await storage.delete("testFile1");
  console.log("List", await storage.list());
  console.log("Load 2", await storage.load("testFile2"));
  await storage.clear();
  console.log("List", await storage.list());

  if (app) {
    app.textContent = "Test Completed" as string;
  }
}

happyPath();
