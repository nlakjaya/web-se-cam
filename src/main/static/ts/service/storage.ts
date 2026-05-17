import { Logger } from "../util/logger";

type Options = {
  browserStorage?: { appName: string; storeName: string };
  noDownload?: boolean;
};

const logger = new Logger("Storage");
export class Storage {
  private options: Options;
  private indexedDB?: IDBDatabase;

  constructor() {
    this.options = {};
    this.indexedDB = undefined;

    logger.debug("instance created:", this.options);
  }

  async init(options?: Partial<Options>) {
    logger.debug("init called:", options);

    this.options = { ...this.options, ...options };
    if (this.options.browserStorage) {
      if (navigator.storage?.persisted && navigator.storage.persist) {
        const persisted = await navigator.storage.persisted();
        if (persisted) {
          logger.info("Browser Storage:", "Persisted");
        } else {
          const granted = await navigator.storage.persist();
          if (granted) {
            logger.info("Browser Storage:", "Persistency granted");
          } else {
            logger.error("browser storage:", "persistency denied");
            logger.warn("browser storage may get cleared!");
          }
        }
      }
      return this.initIndexedDB();
    }
  }

  private async initIndexedDB() {
    if (indexedDB) {
      if (this.options.browserStorage) {
        const options = this.options.browserStorage;
        await new Promise((resolve, reject) => {
          const dbName = `${options.appName}-indexedDB`;
          const request = indexedDB.open(dbName);
          request.onsuccess = (event) => {
            logger.debug(`indexedDB.open("${dbName}").onsuccess called`);
            this.indexedDB = (event.target as IDBRequest<IDBDatabase>).result;
            resolve(undefined);
          };
          request.onupgradeneeded = (event) => {
            logger.debug(`indexedDB.open("${dbName}").onupgradeneeded called`);
            (event.target as IDBRequest<IDBDatabase>).result.createObjectStore(
              options.storeName,
              {
                keyPath: "filename",
              },
            );
          };
          request.onerror = (error) => {
            logger.error(`indexedDB.open("${dbName}") failed:`, error);
            reject(new Error("indexedDB error", { cause: error }));
          };
          request.onblocked = (event) => {
            logger.error(`indexedDB.open("${dbName}") blocked:`, event);
            this.options.browserStorage = undefined;
            if (!this.options.noDownload) {
              logger.info("Fallback to Download on Save");
            }
          };
        });
      }
    } else {
      logger.error("browser storage:", "unsupported");
      this.options.browserStorage = undefined;
      if (!this.options.noDownload) {
        logger.info("Fallback to Download on Save");
      }
    }
  }

  // TODO: Stream instead of Blob
  async save(filename: string, blob: Blob): Promise<void> {
    logger.debug("save called:", filename, blob);

    if (this.options.browserStorage && this.indexedDB) {
      const browserStorage = this.options.browserStorage;
      const indexedDB = this.indexedDB;
      return await new Promise((resolve, reject) => {
        const request = indexedDB
          .transaction([browserStorage.storeName], "readwrite")
          .objectStore(browserStorage.storeName)
          .put({ filename, blob });
        request.onerror = (error) => {
          logger.error("save failed:", filename, error);
          reject(new Error("Unable put to storage", { cause: error }));
        };
        request.onsuccess = () => {
          logger.debug("save success");
          resolve(undefined);
        };
      });
    } else if (!this.options.noDownload) {
      return new Promise((resolve, reject) => {
        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = filename;
          document.body.append(a);
          a.click();
          setTimeout(() => {
            a.remove();
            URL.revokeObjectURL(url);
            logger.debug("save success");
            resolve(undefined);
          }, 0);
        } catch (error) {
          logger.error("save failed:", filename, error);
          reject(error);
        }
      });
    }
  }

  async load(filename: string): Promise<Blob> {
    logger.debug("load called:", filename);

    if (this.options.browserStorage && this.indexedDB) {
      const browserStorage = this.options.browserStorage;
      const indexedDB = this.indexedDB;
      return await new Promise((resolve, reject) => {
        const request = indexedDB
          .transaction([browserStorage.storeName], "readonly")
          .objectStore(browserStorage.storeName)
          .get(filename);
        const onError = (error: Event | Error) => {
          logger.error("load failed:", filename, error);
          reject(new Error("Unable to get from storage", { cause: error }));
        };
        request.onerror = onError;
        request.onsuccess = () => {
          if (request.result.blob) {
            logger.debug("load success:", request.result);
            resolve(request.result.blob);
          } else {
            onError(new Error(`blob not found: "${filename}"`));
          }
        };
      });
    }
    const error = new Error("Load is not supported");
    logger.error("load failed:", filename, error);
    throw error;
  }

  async list(): Promise<string[]> {
    logger.debug("list called");

    if (this.options.browserStorage && this.indexedDB) {
      const browserStorage = this.options.browserStorage;
      const indexedDB = this.indexedDB;
      return await new Promise((resolve, reject) => {
        const request = indexedDB
          .transaction([browserStorage.storeName], "readonly")
          .objectStore(browserStorage.storeName)
          .getAllKeys();
        request.onerror = (error) => {
          logger.error("list failed:", error);
          reject(new Error("Unable to list storage", { cause: error }));
        };
        request.onsuccess = () => {
          logger.debug("list success:", request.result);
          resolve(request.result as string[]);
        };
      });
    }
    const error = new Error("List is not supported");
    logger.error("list failed:", error);
    throw error;
  }

  async delete(filename: string): Promise<void> {
    logger.debug("delete called:", filename);

    if (this.options.browserStorage && this.indexedDB) {
      const browserStorage = this.options.browserStorage;
      const indexedDB = this.indexedDB;
      return await new Promise((resolve, reject) => {
        const request = indexedDB
          .transaction([browserStorage.storeName], "readwrite")
          .objectStore(browserStorage.storeName)
          .delete(filename);
        request.onerror = (error) => {
          logger.error("delete failed:", filename, error);
          reject(new Error("Unable to delete from storage", { cause: error }));
        };
        request.onsuccess = () => {
          logger.debug("delete success");
          resolve(undefined);
        };
      });
    }
    const error = new Error("Delete is not supported");
    logger.error("delete failed:", filename, error);
    throw error;
  }

  async clear(): Promise<void> {
    logger.debug("clear called");

    if (this.options.browserStorage && this.indexedDB) {
      const browserStorage = this.options.browserStorage;
      const indexedDB = this.indexedDB;
      return await new Promise((resolve, reject) => {
        const request = indexedDB
          .transaction([browserStorage.storeName], "readwrite")
          .objectStore(browserStorage.storeName)
          .clear();
        request.onerror = (error) => {
          logger.error("clear failed:", error);
          reject(new Error("Unable to clear storage", { cause: error }));
        };
        request.onsuccess = () => {
          logger.debug("clear success");
          resolve(undefined);
        };
      });
    }
    const error = new Error("Clear is not supported");
    logger.error("clear failed:", error);
    throw error;
  }

  async getStorageInfo() {
    logger.debug("getStorageInfo called");

    if (this.options.browserStorage && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
      };
    }
    return {};
  }
}
