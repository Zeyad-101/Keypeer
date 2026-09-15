import type { KeypeerFile } from '../storage/schema';
export type { KeypeerFile } from '../storage/schema';

export interface KeypeerEntryPublic {
  id: string;
  domain: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface KeypeerStatus {
  initialized: boolean;
  unlocked: boolean;
  autoLockMinutes: number;
  entryCount?: number;
}

export type KeypeerMessage =
  | { type: 'KEYPEER_STATUS' }
  | { type: 'KEYPEER_INIT'; masterPassword: string }
  | { type: 'KEYPEER_UNLOCK'; masterPassword: string }
  | { type: 'KEYPEER_LOCK' }
  | { type: 'KEYPEER_LIST_ENTRIES' }
  | { type: 'KEYPEER_ADD_ENTRY'; domain: string; username: string; password: string; notes?: string }
  | { type: 'KEYPEER_UPDATE_ENTRY'; id: string; fields: Partial<{ domain: string; username: string; password: string; notes: string }> }
  | { type: 'KEYPEER_DELETE_ENTRY'; id: string }
  | { type: 'KEYPEER_HAS_ENTRY_FOR_DOMAIN'; domain: string }
  | { type: 'KEYPEER_GET_MATCHING_CREDENTIALS'; domain: string }
  | { type: 'KEYPEER_SET_AUTO_LOCK'; minutes: number }
  | { type: 'KEYPEER_EXPORT' }
  | { type: 'KEYPEER_IMPORT'; file: KeypeerFile }
  | { type: 'KEYPEER_CHANGE_MASTER_PASSWORD'; oldPassword: string; newPassword: string };

export type KeypeerResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
