import { describe, it, expect } from "vitest";
import { buildPagedResponse, parsePagination } from "../../src/lib/pagination";

describe("parsePagination", () => {
  it("returns defaults when no query params", () => {
    const result = parsePagination({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("parses limit and offset from query", () => {
    const result = parsePagination({ limit: "10", offset: "30" });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(30);
  });

  it("caps limit at 100", () => {
    const result = parsePagination({ limit: "999" });
    expect(result.limit).toBe(100);
  });

  it("clamps negative offset to 0", () => {
    const result = parsePagination({ offset: "-5" });
    expect(result.offset).toBe(0);
  });
});

describe("buildPagedResponse", () => {
  it("correctly sets hasMore when there are more items", () => {
    const result = buildPagedResponse(["a", "b", "c"], 10, 3, 0);
    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(10);
    expect(result.items).toHaveLength(3);
  });

  it("sets hasMore to false on last page", () => {
    const result = buildPagedResponse(["a", "b"], 7, 5, 5);
    expect(result.hasMore).toBe(false);
  });

  it("sets hasMore to false for exact page fit", () => {
    const result = buildPagedResponse(["a", "b", "c"], 3, 3, 0);
    expect(result.hasMore).toBe(false);
  });
});
