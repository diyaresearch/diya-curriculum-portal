/**
 * databaseService.getAllUsers — admin pagination with a role filter (#434).
 *
 * The paginated query used to append `.where('role', ...)` after
 * `.orderBy().offset().limit()`, while the total-count query applied the
 * same filter first. This pins the fix (filter applied before
 * offset/limit) against a fake Firestore that models real query semantics
 * — filter, then order, then offset, then limit — so a reintroduced
 * ordering bug that actually changed results would fail here.
 */

const { DatabaseService } = require("../services/databaseService");

function makeFakeDb(records) {
  function query(state) {
    return {
      where(field, op, value) {
        if (op !== "==") throw new Error(`unsupported operator ${op}`);
        return query({ ...state, filters: [...state.filters, { field, value }] });
      },
      orderBy(field, direction) {
        return query({ ...state, orderBy: { field, direction } });
      },
      offset(n) {
        return query({ ...state, offset: n });
      },
      limit(n) {
        return query({ ...state, limit: n });
      },
      count() {
        return {
          get: async () => ({ data: () => ({ count: resolve().length }) }),
        };
      },
      get: async () => ({
        docs: resolve().map((r) => ({
          id: r.id,
          data: () => r,
        })),
      }),
    };

    function resolve() {
      let docs = records.filter((r) =>
        state.filters.every((f) => r[f.field] === f.value)
      );
      if (state.orderBy) {
        const { field, direction } = state.orderBy;
        docs = [...docs].sort((a, b) =>
          direction === "desc" ? b[field] - a[field] : a[field] - b[field]
        );
      }
      if (state.offset) docs = docs.slice(state.offset);
      if (state.limit != null) docs = docs.slice(0, state.limit);
      return docs;
    }
  }

  return {
    collection: () => query({ filters: [] }),
  };
}

function makeUsers() {
  const users = [];
  for (let i = 0; i < 15; i++) {
    users.push({ id: `teacher-${i}`, role: "teacherDefault", createdAt: i });
  }
  for (let i = 0; i < 5; i++) {
    users.push({ id: `admin-${i}`, role: "admin", createdAt: 100 + i });
  }
  return users;
}

describe("getAllUsers with a role filter", () => {
  test("totalUsers, totalPages and the returned page all agree with the count query", async () => {
    const service = new DatabaseService();
    service.isInitialized = true;
    service.db = makeFakeDb(makeUsers());

    const result = await service.getAllUsers("users", {
      page: 1,
      limit: 10,
      role: "teacherDefault",
      orderBy: "createdAt",
      orderDirection: "desc",
    });

    // 15 teacherDefault users exist — the count query and the pagination
    // math must reflect that, not the unfiltered total of 20.
    expect(result.totalUsers).toBe(15);
    expect(result.totalPages).toBe(2);
    expect(result.users).toHaveLength(10);
    expect(result.users.every((doc) => doc.data().role === "teacherDefault")).toBe(true);

    // Second page picks up the remaining 5, still filtered.
    const page2 = await service.getAllUsers("users", {
      page: 2,
      limit: 10,
      role: "teacherDefault",
      orderBy: "createdAt",
      orderDirection: "desc",
    });
    expect(page2.users).toHaveLength(5);
    expect(page2.hasNextPage).toBe(false);
  });

  test("no role filter returns every user, unfiltered count included", async () => {
    const service = new DatabaseService();
    service.isInitialized = true;
    service.db = makeFakeDb(makeUsers());

    const result = await service.getAllUsers("users", { page: 1, limit: 20 });

    expect(result.totalUsers).toBe(20);
    expect(result.users).toHaveLength(20);
  });
});
