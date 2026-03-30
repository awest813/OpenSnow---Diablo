import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  normalizePreferences,
  savePreferences,
} from './preferences';

describe('preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes invalid values to defaults', () => {
    const normalized = normalizePreferences({
      touchLayoutPreset: 'unknown',
      touchPanSensitivity: 'hyper',
      mobileOnboardingDismissed: 'yes',
    });

    expect(normalized).toEqual({
      touchLayoutPreset: 'default',
      touchPanSensitivity: 'normal',
      mobileOnboardingDismissed: true,
      testerWelcomeDismissed: false,
      highContrastMode: false,
    });
  });

  it('loads defaults when no preferences exist', () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists and merges preference updates', () => {
    savePreferences({touchLayoutPreset: 'thumb'});
    savePreferences({touchPanSensitivity: 'high', mobileOnboardingDismissed: true});

    expect(loadPreferences()).toEqual({
      touchLayoutPreset: 'thumb',
      touchPanSensitivity: 'high',
      mobileOnboardingDismissed: true,
      testerWelcomeDismissed: false,
      highContrastMode: false,
    });
  });

  it('falls back to defaults when stored JSON is invalid', () => {
    window.localStorage.setItem('diabloweb.preferences.v1', '{bad json');

    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists and restores highContrastMode', () => {
    savePreferences({highContrastMode: true});
    expect(loadPreferences().highContrastMode).toBe(true);
    savePreferences({highContrastMode: false});
    expect(loadPreferences().highContrastMode).toBe(false);
  });

  it('normalizes highContrastMode to boolean', () => {
    expect(normalizePreferences({highContrastMode: 1}).highContrastMode).toBe(true);
    expect(normalizePreferences({highContrastMode: 0}).highContrastMode).toBe(false);
    expect(normalizePreferences({highContrastMode: 'true'}).highContrastMode).toBe(true);
    expect(normalizePreferences({}).highContrastMode).toBe(false);
  });

  it('normalizes testerWelcomeDismissed to boolean', () => {
    expect(normalizePreferences({testerWelcomeDismissed: 1}).testerWelcomeDismissed).toBe(true);
    expect(normalizePreferences({testerWelcomeDismissed: 0}).testerWelcomeDismissed).toBe(false);
    expect(normalizePreferences({}).testerWelcomeDismissed).toBe(false);
  });

  it('persists and restores testerWelcomeDismissed', () => {
    savePreferences({testerWelcomeDismissed: true});
    expect(loadPreferences().testerWelcomeDismissed).toBe(true);
    savePreferences({testerWelcomeDismissed: false});
    expect(loadPreferences().testerWelcomeDismissed).toBe(false);
  });
});
