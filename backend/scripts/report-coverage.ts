import { readFile } from "node:fs/promises";
import path from "node:path";

type CoverageRecord = {
  file: string;
  linesFound: number;
  linesHit: number;
  branchesFound: number;
  branchesHit: number;
};

type CoverageMap = Map<string, CoverageRecord>;

function parseArgs() {
  const args = process.argv.slice(2);
  let baselinePath: string | null = null;
  let currentPath = path.resolve("coverage", "lcov.info");

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextArg = args[index + 1];

    if (arg === "--baseline" && nextArg) {
      baselinePath = path.resolve(nextArg);
      index += 1;
      continue;
    }

    if (arg === "--current" && nextArg) {
      currentPath = path.resolve(nextArg);
      index += 1;
    }
  }

  return { baselinePath, currentPath };
}

function ensureRecord(records: CoverageMap, file: string) {
  const existing = records.get(file);
  if (existing) {
    return existing;
  }

  const created: CoverageRecord = {
    file,
    linesFound: 0,
    linesHit: 0,
    branchesFound: 0,
    branchesHit: 0,
  };
  records.set(file, created);
  return created;
}

function parseLcov(contents: string) {
  const records: CoverageMap = new Map();
  let currentFile: string | null = null;

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("SF:")) {
      currentFile = line.slice(3);
      ensureRecord(records, currentFile);
      continue;
    }

    if (!currentFile) {
      continue;
    }

    const record = ensureRecord(records, currentFile);

    if (line.startsWith("LF:")) {
      record.linesFound = Number(line.slice(3));
      continue;
    }

    if (line.startsWith("LH:")) {
      record.linesHit = Number(line.slice(3));
      continue;
    }

    if (line.startsWith("BRF:")) {
      record.branchesFound = Number(line.slice(4));
      continue;
    }

    if (line.startsWith("BRH:")) {
      record.branchesHit = Number(line.slice(4));
    }
  }

  return records;
}

function toPercent(hit: number, found: number) {
  if (found === 0) {
    return 100;
  }

  return (hit / found) * 100;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function summarize(records: CoverageMap) {
  const values = [...records.values()];
  const totals = values.reduce(
    (summary, record) => {
      summary.linesFound += record.linesFound;
      summary.linesHit += record.linesHit;
      summary.branchesFound += record.branchesFound;
      summary.branchesHit += record.branchesHit;
      return summary;
    },
    { linesFound: 0, linesHit: 0, branchesFound: 0, branchesHit: 0 },
  );

  const byLowestLines = values
    .filter((record) => record.linesFound > 0)
    .sort((left, right) => toPercent(left.linesHit, left.linesFound) - toPercent(right.linesHit, right.linesFound))
    .slice(0, 10);

  return { totals, byLowestLines };
}

function toDisplayPath(file: string) {
  return file.replaceAll("\\", "/").replace(/^.*giftedntalented[^/]*\//u, "");
}

async function readCoverageFile(filePath: string) {
  const contents = await readFile(filePath, "utf8");
  return parseLcov(contents);
}

function printSummary(title: string, records: CoverageMap) {
  const { totals, byLowestLines } = summarize(records);
  console.log(title);
  console.log(`- overall lines: ${formatPercent(toPercent(totals.linesHit, totals.linesFound))} (${totals.linesHit}/${totals.linesFound})`);
  console.log(`- overall branches: ${formatPercent(toPercent(totals.branchesHit, totals.branchesFound))} (${totals.branchesHit}/${totals.branchesFound})`);
  console.log("- lowest line coverage files:");

  for (const record of byLowestLines) {
    const lineCoverage = formatPercent(toPercent(record.linesHit, record.linesFound));
    const branchCoverage = formatPercent(toPercent(record.branchesHit, record.branchesFound));
    console.log(`  - ${toDisplayPath(record.file)}: lines ${lineCoverage}, branches ${branchCoverage}`);
  }
}

function printDelta(currentRecords: CoverageMap, baselineRecords: CoverageMap) {
  console.log("delta vs baseline:");
  const changed = [...currentRecords.values()]
    .map((record) => {
      const baseline = baselineRecords.get(record.file);
      const currentLinePercent = toPercent(record.linesHit, record.linesFound);
      const baselineLinePercent = baseline ? toPercent(baseline.linesHit, baseline.linesFound) : null;
      const delta = baselineLinePercent === null ? null : currentLinePercent - baselineLinePercent;
      return { record, delta };
    })
    .filter((entry) => entry.delta !== null && Math.abs(entry.delta ?? 0) >= 0.01)
    .sort((left, right) => (right.delta ?? 0) - (left.delta ?? 0));

  if (changed.length === 0) {
    console.log("  - no file-level line coverage deltas detected");
    return;
  }

  for (const { record, delta } of changed.slice(0, 15)) {
    const sign = (delta ?? 0) >= 0 ? "+" : "";
    console.log(`  - ${toDisplayPath(record.file)}: ${sign}${(delta ?? 0).toFixed(2)} pts`);
  }
}

async function main() {
  const { baselinePath, currentPath } = parseArgs();
  const currentRecords = await readCoverageFile(currentPath);

  printSummary(`coverage summary from ${currentPath}`, currentRecords);

  if (!baselinePath) {
    return;
  }

  const baselineRecords = await readCoverageFile(baselinePath);
  printDelta(currentRecords, baselineRecords);
}

await main();
