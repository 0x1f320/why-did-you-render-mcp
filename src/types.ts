import type {
	ReasonForUpdate,
	UpdateInfo,
} from "@welldone-software/why-did-you-render";

export type { UpdateInfo } from "@welldone-software/why-did-you-render";

export interface RenderReport {
	displayName: string;
	reason: ReasonForUpdate;
	hookName?: string;
}

export type WsMessage = {
	type: "render";
	payload: RenderReport;
};
