import { describe, expect, it } from "vitest";
import { describeValue } from "./describe-value.js";

describe("describeValue", () => {
	it("describes null", () => {
		expect(describeValue(null)).toBe("null");
	});

	it("describes undefined", () => {
		expect(describeValue(undefined)).toBe("undefined");
	});

	it("describes named functions", () => {
		function myFunc() {}
		expect(describeValue(myFunc)).toBe("function myFunc");
	});

	it("describes anonymous functions", () => {
		expect(describeValue(() => {})).toBe("function anonymous");
	});

	it("describes primitives", () => {
		expect(describeValue(42)).toBe("42");
		expect(describeValue("hello")).toBe("hello");
		expect(describeValue(true)).toBe("true");
	});

	it("describes arrays with length", () => {
		expect(describeValue([1, 2, 3])).toBe("Array(3)");
		expect(describeValue([])).toBe("Array(0)");
	});

	it("describes plain objects", () => {
		expect(describeValue({})).toBe("Object");
	});

	it("describes class instances by constructor name", () => {
		class MyComponent {}
		expect(describeValue(new MyComponent())).toBe("MyComponent");
	});

	it("describes built-in types", () => {
		expect(describeValue(new Map())).toBe("Map");
		expect(describeValue(new Date())).toBe("Date");
		expect(describeValue(new Set())).toBe("Set");
	});
});
