const ROMAN_YEAR_MAP: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
};

function inferYearFromLegacyBatch(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  const compact = raw.replace(/\s+/g, " ");
  const batchMatch = compact.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (!batchMatch) return compact;

  const startYear = Number.parseInt(batchMatch[1], 10);
  const endYear = Number.parseInt(batchMatch[2], 10);
  const inferredYear = endYear - startYear;

  if (Number.isFinite(inferredYear) && inferredYear >= 1 && inferredYear <= 5) {
    return String(inferredYear);
  }

  return compact;
}

function normalizeStudentYearValue(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "all students") return "all students";

  const compact = raw.replace(/\s+/g, " ");
  const digitMatch = compact.match(/^(\d)(?:st|nd|rd|th)?(?:\s*year)?$/);
  if (digitMatch) return digitMatch[1];

  const romanMatch = compact.match(/^(i|ii|iii|iv|v)(?:\s*year)?$/);
  if (romanMatch) return ROMAN_YEAR_MAP[romanMatch[1]];

  return compact;
}

function normalizeDriveYearValue(value: unknown): string {
  const normalized = normalizeStudentYearValue(value);
  if (normalized && normalized !== String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ")) {
    return normalized;
  }

  return inferYearFromLegacyBatch(value);
}

export function matchesEligibleYear(driveTargetYear: unknown, studentYear: unknown): boolean {
  const normalizedDriveYear = normalizeDriveYearValue(driveTargetYear || "4th Year");
  const normalizedStudentYear = normalizeStudentYearValue(studentYear || "4");

  if (normalizedDriveYear === "all students") return true;
  return normalizedDriveYear === normalizedStudentYear;
}

export function formatYearLabel(value: unknown): string {
  const normalized = normalizeStudentYearValue(value);
  if (!normalized) return "N/A";
  if (normalized === "all students") return "All Students";

  const yearNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(yearNumber)) {
    if (yearNumber === 1) return "1st Year";
    if (yearNumber === 2) return "2nd Year";
    if (yearNumber === 3) return "3rd Year";
    return `${yearNumber}th Year`;
  }

  return String(value ?? "N/A");
}

export function formatEligibleYearLabel(value: unknown): string {
  const normalized = normalizeDriveYearValue(value);
  if (!normalized) return "N/A";
  if (normalized === "all students") return "All Students";

  const yearNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(yearNumber)) {
    if (yearNumber === 1) return "1st Year";
    if (yearNumber === 2) return "2nd Year";
    if (yearNumber === 3) return "3rd Year";
    return `${yearNumber}th Year`;
  }

  return String(value ?? "N/A");
}

export function parseEligibilityNumber(value: unknown): number {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "no" || raw === "none" || raw === "nil" || raw === "n/a") return 0;

  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
