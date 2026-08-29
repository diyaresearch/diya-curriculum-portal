/**
 * Tests for the ownership resolver (issue #424).
 *
 * The subtle case is `Author`: it holds a uid on server-created content and a
 * display name on client-created content. A naive comparison locks owners out
 * of their own documents, so these tests pin the disambiguation down.
 */

jest.mock("../services/databaseService", () => ({
  databaseService: {
    initialize: async () => {},
    getUserDocument: async (uid) => ({
      snap: {
        exists: Boolean(global.__roles && global.__roles[uid]),
        data: () => ({ role: global.__roles[uid] }),
      },
    }),
  },
}));

const { resolveOwnerUid, looksLikeUid, isAdminUser, canMutate } = require("../utils/ownership");

const OWNER = "aBcDeFgHiJkLmNoPqRsTuVwXyZ12";
const OTHER = "zZyYxXwWvVuUtTsSrRqQpPoOnN98";

beforeEach(() => {
  global.__roles = {};
});

describe("resolveOwnerUid", () => {
  test("prefers User (client-created content stores the uid there)", () => {
    expect(resolveOwnerUid({ User: OWNER, Author: "Jane Teacher" })).toBe(OWNER);
  });

  test("accepts Author when it holds a uid (server-created content)", () => {
    expect(resolveOwnerUid({ Author: OWNER })).toBe(OWNER);
  });

  test("ignores Author when it holds a display name", () => {
    expect(resolveOwnerUid({ Author: "Jane Teacher" })).toBeNull();
  });

  test("resolves author and authorId on modules and lessons", () => {
    expect(resolveOwnerUid({ author: OWNER })).toBe(OWNER);
    expect(resolveOwnerUid({ authorId: OWNER })).toBe(OWNER);
  });

  test("returns null for documents recording no owner", () => {
    expect(resolveOwnerUid({ title: "Legacy module" })).toBeNull();
    expect(resolveOwnerUid(null)).toBeNull();
  });

  test("a display name is never mistaken for a uid", () => {
    expect(looksLikeUid("Jane Teacher")).toBe(false);
    expect(looksLikeUid("short")).toBe(false);
    expect(looksLikeUid(OWNER)).toBe(true);
  });
});

describe("canMutate", () => {
  const req = (uid) => ({ user: uid ? { uid } : undefined });

  test("the owner may mutate their own document", async () => {
    await expect(canMutate(req(OWNER), { author: OWNER })).resolves.toBe(true);
  });

  test("the owner of client-created content may mutate it", async () => {
    await expect(
      canMutate(req(OWNER), { User: OWNER, Author: "Jane Teacher" })
    ).resolves.toBe(true);
  });

  test("a different signed-in user may not", async () => {
    await expect(canMutate(req(OTHER), { author: OWNER })).resolves.toBe(false);
  });

  test("an admin may mutate anyone's document", async () => {
    global.__roles[OTHER] = "admin";
    await expect(canMutate(req(OTHER), { author: OWNER })).resolves.toBe(true);
  });

  test("an anonymous request may not mutate anything", async () => {
    await expect(canMutate(req(null), { author: OWNER })).resolves.toBe(false);
  });

  test("an ownerless document is editable only by an admin", async () => {
    await expect(canMutate(req(OTHER), { title: "Legacy" })).resolves.toBe(false);
    global.__roles[OTHER] = "admin";
    await expect(canMutate(req(OTHER), { title: "Legacy" })).resolves.toBe(true);
  });

  test("a teacherPlus user is not an admin", async () => {
    global.__roles[OTHER] = "teacherPlus";
    await expect(isAdminUser(OTHER)).resolves.toBe(false);
    await expect(canMutate(req(OTHER), { author: OWNER })).resolves.toBe(false);
  });
});
