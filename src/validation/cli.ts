import { runGoldenCaseSuite } from './runGoldenSuite.js';
import { logSuiteResult } from './reporting.js';

const runtime = globalThis as typeof globalThis & {
  process?: {
    exitCode?: number;
  };
};

try {
  const result = await runGoldenCaseSuite();
  logSuiteResult(result);

  if (!result.overallPassed && runtime.process) {
    runtime.process.exitCode = 1;
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );

  if (runtime.process) {
    runtime.process.exitCode = 1;
  }
}
