import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("frontend build metadata configuration", () => {
  it("pins the CI-tested revision into the Railway Docker build", () => {
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );
    const builderStage = dockerfile.split(
      "# ---- Stage 3: Production runner ----",
    )[0];
    const nextConfig = readFileSync(
      resolve(process.cwd(), "next.config.ts"),
      "utf8",
    );
    const deployWorkflow = readFileSync(
      resolve(process.cwd(), "../.github/workflows/railway-deploy.yml"),
      "utf8",
    );

    expect(builderStage).toContain("ARG APP_GIT_COMMIT_SHA");
    expect(builderStage).toContain("ARG RAILWAY_GIT_COMMIT_SHA");
    expect(builderStage).toContain("RUN npm run build");
    expect(nextConfig).toContain("process.env.APP_GIT_COMMIT_SHA");
    expect(
      deployWorkflow.match(/APP_GIT_COMMIT_SHA=\$TESTED_SHA/g),
    ).toHaveLength(2);
    expect(
      deployWorkflow.match(/railway variable set/g),
    ).toHaveLength(2);
    expect(deployWorkflow).toContain("--skip-deploys");
  });
});
