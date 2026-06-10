export type CompanySettings = {
  theme: 'light' | 'dark' | 'system';
  stylePreset: 'default' | 'compact' | 'contrast' | 'soft';
  compactLayout: boolean;
  largerTextMode: boolean;
  chemCalcEnabled: boolean;
  chlorineType: 'liquid' | 'cal-hypo' | 'trichlor' | 'dichlor';
  chlorineStrength: number;
  poolVolumeGallons: number;
  dosingUnit: 'ounces' | 'cups' | 'gallons' | 'pounds';
  babyPoolSafety: boolean;
  requireApproval: boolean;
  retestReminder: number;
  masterNotifications: boolean;
  missedTestAlerts: boolean;
  outOfRangeAlerts: boolean;
  newAnnouncementAlerts: boolean;
  dailySummary: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  requirePhotoEveryTest: boolean;
  requirePhotoOutOfRange: boolean;
  requirePhotoBabyPools: boolean;
  allowGalleryUploads: boolean;
  cameraOnlyMode: boolean;
};

export const defaultCompanySettings: CompanySettings = {
  theme: 'light',
  stylePreset: 'default',
  compactLayout: false,
  largerTextMode: false,
  chemCalcEnabled: true,
  chlorineType: 'liquid',
  chlorineStrength: 12.5,
  poolVolumeGallons: 25000,
  dosingUnit: 'ounces',
  babyPoolSafety: true,
  requireApproval: true,
  retestReminder: 30,
  masterNotifications: true,
  missedTestAlerts: true,
  outOfRangeAlerts: true,
  newAnnouncementAlerts: true,
  dailySummary: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  requirePhotoEveryTest: false,
  requirePhotoOutOfRange: true,
  requirePhotoBabyPools: true,
  allowGalleryUploads: true,
  cameraOnlyMode: false,
};

export const mergeCompanySettings = (raw: unknown): CompanySettings => {
  if (!raw || typeof raw !== 'object') {
    return { ...defaultCompanySettings };
  }

  return { ...defaultCompanySettings, ...(raw as Partial<CompanySettings>) };
};

export type PhotoRequirementInput = {
  freeChlorine: number;
  ph: number;
  poolType?: string | null;
  chlorineMin?: number | null;
  chlorineMax?: number | null;
  phMin?: number | null;
  phMax?: number | null;
};

export const isOutOfRangeReading = (input: PhotoRequirementInput) => {
  const chlorineMin = input.chlorineMin ?? 1;
  const chlorineMax = input.chlorineMax ?? 4;
  const phMin = input.phMin ?? 7.2;
  const phMax = input.phMax ?? 7.8;

  return (
    input.freeChlorine < chlorineMin ||
    input.freeChlorine > chlorineMax ||
    input.ph < phMin ||
    input.ph > phMax
  );
};

export const isBabyPool = (poolType?: string | null) =>
  Boolean(poolType && /baby|wading|kiddie|toddler|infant/i.test(poolType));

export const getPhotoRequirementMessage = (
  settings: CompanySettings,
  input: PhotoRequirementInput,
  hasPhoto: boolean,
) => {
  if (hasPhoto) return null;

  if (settings.requirePhotoEveryTest) {
    return 'A photo is required for every chemistry log.';
  }

  if (settings.requirePhotoOutOfRange && isOutOfRangeReading(input)) {
    return 'A photo is required when readings are out of range.';
  }

  if (settings.requirePhotoBabyPools && isBabyPool(input.poolType)) {
    return 'A photo is required for baby and wading pools.';
  }

  return null;
};
