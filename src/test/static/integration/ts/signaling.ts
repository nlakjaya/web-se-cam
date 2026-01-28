// @ts-expect-error
import { Signaling } from "../../../ts/service/signaling";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

function generateRandomString() {
  const buffer = new Uint8Array(6);
  window.crypto.getRandomValues(buffer);
  return buffer.reduce(
    (str, byte) => str + byte.toString(16).padStart(2, "0"),
    "",
  );
}

const clientA = `clientA-${generateRandomString()}`;
const clientB = `clientB-${generateRandomString()}`;

async function happyPath(clientId: string, recipientId?: string) {
  const signaling = new Signaling(clientId, {
    onMessage: (message: string, from: string) => {
      if (app && from == clientB) {
        app.textContent = message;
      }
    },
    onOpen: async () => {
      if (recipientId) {
        signaling.send(recipientId, "Test Completed");
      }
      await sleep(3000);
      signaling.close();
    },
  });
}

happyPath(clientA);
happyPath(clientB, clientA);
