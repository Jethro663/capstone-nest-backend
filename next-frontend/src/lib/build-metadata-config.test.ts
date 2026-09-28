import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("frontend build metadata configuration", () => {
  it("declares Railway commit metadata in the Docker builder stage", () => {
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );
    const builderStage = dockerfile.split(
      "# ---- Stage 3: Production runner ----",
    )[0];

    expect(builderStage).toContain("ARG RAILWAY_GIT_COMMIT_SHA");
    expect(builderStage).toContain("RUN npm run build");
  });
});
