import path from 'node:path';

const PACKAGE_NAME = 'NEXORA_HANDOFF_2026-10-01';

export function assertSafeOutputPath(repoRoot, outputPath) {
  if (!path.isAbsolute(repoRoot) || !path.isAbsolute(outputPath)) {
    throw new Error('Repository and output paths must be absolute');
  }

  const normalizedRoot = path.resolve(repoRoot);
  const normalizedOutput = path.resolve(outputPath);
  const expected = path.join(normalizedRoot, 'output', PACKAGE_NAME);

  if (normalizedOutput !== expected || outputPath !== normalizedOutput) {
    throw new Error(`Refusing unsafe output path: ${outputPath}`);
  }

  if (normalizedOutput === normalizedRoot || normalizedOutput === path.parse(normalizedOutput).root) {
    throw new Error(`Refusing broad output path: ${outputPath}`);
  }

  return normalizedOutput;
}
