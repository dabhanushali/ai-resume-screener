export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  );
}

export function parseFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function validateFileSize(file: File): string | null {
  if (file.size === 0) return 'Uploaded file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) return `File is too large. Upload files up to ${MAX_UPLOAD_MB}MB.`;
  return null;
}

export function validateScoringSettings(settings: {
  weightSkills: number;
  weightExperience: number;
  weightRelevance: number;
  weightPreferred: number;
  weightEducation: number;
  weightNoticePeriod: number;
  thresholdShortlist: number;
  thresholdReview: number;
  minExperience: number;
  maxExperience: number;
}): string | null {
  const weights = [
    settings.weightSkills,
    settings.weightExperience,
    settings.weightRelevance,
    settings.weightPreferred,
    settings.weightEducation,
    settings.weightNoticePeriod
  ];

  if (weights.some((weight) => weight < 0 || weight > 100)) {
    return 'Each scoring weight must be between 0 and 100.';
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (Math.round(total * 100) / 100 !== 100) {
    return `Scoring weights must add up to exactly 100%. Currently: ${total}%.`;
  }

  if (settings.thresholdReview < 0 || settings.thresholdReview > 100 || settings.thresholdShortlist < 0 || settings.thresholdShortlist > 100) {
    return 'Review and shortlist thresholds must be between 0 and 100.';
  }

  if (settings.thresholdReview >= settings.thresholdShortlist) {
    return 'Review score must be lower than shortlist score.';
  }

  if (settings.minExperience < 0 || settings.maxExperience < 0 || settings.minExperience > settings.maxExperience) {
    return 'Experience range is invalid.';
  }

  return null;
}
