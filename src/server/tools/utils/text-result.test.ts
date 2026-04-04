import { describe, expect, it } from "vitest";
import { textResult } from "./text-result.js";

describe("textResult", () => {
	it("wraps text in MCP content format", () => {
		expect(textResult("hello")).toEqual({
			content: [{ type: "text", text: "hello" }],
		});
	});

	it("handles empty string", () => {
		expect(textResult("")).toEqual({
			content: [{ type: "text", text: "" }],
		});
	});
});
