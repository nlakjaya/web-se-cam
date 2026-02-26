import { Request } from "express";
import url from "url";
import { WebSocket } from "ws";

const SIGNALLING_MAX_CLIENTS_COUNT = process.env.SIGNALLING_MAX_CLIENTS_COUNT
  ? parseInt(process.env.SIGNALLING_MAX_CLIENTS_COUNT)
  : 16;

const clients = new Map<string, WebSocket>();

export function getHandlerSubscribe() {
  console.log(`Max no of clients: ${SIGNALLING_MAX_CLIENTS_COUNT}`);
  return (ws: WebSocket, req: Request) => {
    const urlObj = url.parse(req.url || "", true);
    const clientId = urlObj.query.id as string;
    if (!clientId) {
      console.error("ws subscribe:", "missing parameter:", "id");
      ws.send(
        JSON.stringify({ error: "Registration failed: Missing parameter: id" }),
      );
      ws.close(4400);
      return;
    }

    if (clients.has(clientId)) {
      console.error("ws client already exist and overriding:", clientId);
      clients.get(clientId)?.close();
    } else if (clients.size == SIGNALLING_MAX_CLIENTS_COUNT) {
      console.error(
        "ws subscribe:",
        "clients count exceeded:",
        SIGNALLING_MAX_CLIENTS_COUNT,
      );
      ws.send(
        JSON.stringify({
          error: "Registration failed: clients count exceeded",
        }),
      );
      ws.close(4503);
    }
    clients.set(clientId, ws);
    console.log("ws client registered:", clientId);

    ws.on("message", (message) => {
      console.log("ws client message:", clientId, message);
      try {
        const { recipientId, data } = JSON.parse(message.toString());
        if (recipientId && clients.has(recipientId)) {
          const recipientWs = clients.get(recipientId);
          if (recipientWs?.readyState === WebSocket.OPEN) {
            recipientWs.send(
              JSON.stringify({
                from: clientId,
                data: data,
              }),
            );
          }
        } else {
          console.error("ws recipient not found:", recipientId);
          ws.send(
            JSON.stringify({ error: `Recipient ${recipientId} not found` }),
          );
        }
      } catch (err) {
        console.error("ws client message error:", clientId, message, err);
        ws.send(JSON.stringify({ error: "Invalid JSON format" }));
      }
    });

    ws.on("close", () => {
      clients.delete(clientId);
      console.log("ws client disconnected:", clientId);
    });
  };
}
