import type { ReporterMemoryEntry } from '../../core/battle/types';

export type { ReporterMemoryEntry };

export type MemoryType =
  | 'STAGE_BRIEF'
  | 'HIGHLIGHT'
  | 'SHAME'
  | 'ACCIDENT'
  | 'PLAYER_INTERVENTION'
  | 'ITEM_DRAMA'
  | 'MUTATION_DRAMA'
  | 'PROMPT_INJECTION'
  | 'ZOG_NOTE';
