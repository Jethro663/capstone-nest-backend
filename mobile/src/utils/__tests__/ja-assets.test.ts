import { resolveJaAvatar, resolveJaStateFromMessage } from "../jaAssets";

describe("ja asset mapping", () => {
  it("maps visible assistant states to the copied JA image names", () => {
    expect(resolveJaAvatar("idle").assetName).toBe("ja_wave.png");
    expect(resolveJaAvatar("thinking").assetName).toBe("ja_thinking.png");
    expect(resolveJaAvatar("success").assetName).toBe("ja_cheer.png");
    expect(resolveJaAvatar("warning").assetName).toBe("ja_shock.png");
    expect(resolveJaAvatar("blocked").assetName).toBe("ja_sad.png");
  });

  it("derives a blocked state from safety messages", () => {
    expect(resolveJaStateFromMessage({ blocked: true, content: "I cannot answer that." })).toBe("blocked");
    expect(resolveJaStateFromMessage({ insufficientEvidence: true, content: "I need more lesson context." })).toBe("blocked");
    expect(resolveJaStateFromMessage({ content: "Great work." })).toBe("success");
  });
});
