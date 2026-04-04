import { WebSocketServer } from "ws";
import type { WsMessage } from "../types.js";
import { addRender } from "./store.js";

export function createWsServer(port: number): WebSocketServer {
	const wss = new WebSocketServer({ port });

	wss.on("connection", (ws) => {
		console.error(`[wdyr-mcp] browser connected (ws://localhost:${port})`);

		ws.on("message", (raw) => {
			try {
				const msg: WsMessage = JSON.parse(String(raw));
				if (msg.type === "render") {
					addRender(msg.payload);
				}
			} catch {
				console.error("[wdyr-mcp] invalid message received");
			}
		});

		ws.on("close", () => {
			console.error("[wdyr-mcp] browser disconnected");
		});
	});

	console.error(
		`[wdyr-mcp] WebSocket server listening on ws://localhost:${port}`,
	);
	return wss;
}
