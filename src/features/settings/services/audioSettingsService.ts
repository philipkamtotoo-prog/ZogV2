import {
  loadAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from './settingsRepository';

export function loadAudioSettingsDraft(): AudioSettings {
  return loadAudioSettings();
}

export function saveAudioSettingsDraft(audio: AudioSettings): AudioSettings {
  return saveAudioSettings(audio);
}
