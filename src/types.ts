export interface RenderInfo {
	componentName: string;
	reason: {
		propsDifferences: PropDifference[] | null;
		stateDifferences: StateDifference[] | null;
		hookDifferences: HookDifference[] | null;
	};
	timestamp: number;
}

export interface PropDifference {
	pathString: string;
	prevValue: unknown;
	nextValue: unknown;
}

export interface StateDifference {
	pathString: string;
	prevValue: unknown;
	nextValue: unknown;
}

export interface HookDifference {
	hookName: string;
	pathString: string;
	prevValue: unknown;
	nextValue: unknown;
}

export interface WsMessage {
	type: "render";
	payload: RenderInfo;
}
