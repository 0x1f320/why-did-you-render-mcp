import type { UpdateInfo, WsMessage } from "../types.js";
import { sanitizeReason } from "./utils/sanitize-reason.js";

const DEFAULT_WS_URL = "ws://localhost:4649";

export interface ClientOptions {
	wsUrl?: string;
	projectId?: string;
}

export function buildOptions(opts?: ClientOptions) {
	const wsUrl = opts?.wsUrl ?? DEFAULT_WS_URL;
	const projectId =
		opts?.projectId ?? globalThis.location?.origin ?? "default";
	let ws: WebSocket | null = null;
	let queue: WsMessage[] = [];

	function connect() {
		ws = new WebSocket(wsUrl);

		ws.addEventListener("open", () => {
			for (const msg of queue) {
				ws?.send(JSON.stringify(msg));
			}
			queue = [];
		});

		ws.addEventListener("close", () => {
			ws = null;
			setTimeout(connect, 1000);
		});

		ws.addEventListener("error", () => {
			ws?.close();
		});
	}

	connect();

	function send(msg: WsMessage) {
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(msg));
		} else {
			queue.push(msg);
		}
	}

	return {
		notifier(info: UpdateInfo) {
			send({
				type: "render",
				projectId,
				payload: {
					displayName: info.displayName,
					reason: sanitizeReason(info.reason),
					hookName: info.hookName,
				},
			});
		},
	};
}
