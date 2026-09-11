import fs from "node:fs";
import path from "node:path";
import { mergeAdminPages, nextAdminPage } from "../admin-pagination";

describe("administrator virtualized pagination", () => {
  it("merges retained pages with stable identity and no duplicate records", () => {
    expect(
      mergeAdminPages(
        [
          {
            data: [{ id: "a" }, { id: "b" }],
            page: 1,
            limit: 2,
            total: 3,
            totalPages: 2,
          },
          {
            data: [{ id: "b" }, { id: "c" }],
            page: 2,
            limit: 2,
            total: 3,
            totalPages: 2,
          },
        ],
        (entry) => entry.id,
      ),
    ).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });

  it("loads only the next known server page", () => {
    expect(
      nextAdminPage({ data: [], page: 1, limit: 25, total: 60, totalPages: 3 }),
    ).toBe(2);
    expect(
      nextAdminPage({ data: [], page: 3, limit: 25, total: 60, totalPages: 3 }),
    ).toBeUndefined();
  });

  it("uses a FlatList with bounded incremental loading and refresh states", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../AdminPaginatedList.tsx"),
      "utf8",
    );
    expect(source).toContain("FlatList");
    expect(source).toContain("onEndReached");
    expect(source).toContain("RefreshControl");
    expect(source).toContain("ListEmptyComponent");
    expect(source).toContain("fetchNextPage");
    expect(source).not.toContain("ScrollView");
  });
});
