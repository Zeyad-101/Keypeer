let currentKey: CryptoKey | null = null;
let lastActivityTimestamp = 0;
let autoLockMinutes = 5;
let lockTimer: ReturnType<typeof setTimeout> | null = null;

export function setKey(key: CryptoKey, lockDurationMinutes?: number): void {
  currentKey = key;
  if (typeof lockDurationMinutes === 'number' && lockDurationMinutes > 0) {
    autoLockMinutes = lockDurationMinutes;
  }
  touch();
}

export function getKey(): CryptoKey | null {
  if (!currentKey) return null;

  // Verify activity timestamp against timeout limit
  const timeoutMs = autoLockMinutes * 60 * 1000;
  if (Date.now() - lastActivityTimestamp > timeoutMs) {
    clearKey();
    return null;
  }

  touch();
  return currentKey;
}

export function isUnlocked(): boolean {
  return getKey() !== null;
}

export function clearKey(): void {
  currentKey = null;
  lastActivityTimestamp = 0;
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
}

export function touch(): void {
  lastActivityTimestamp = Date.now();
  if (lockTimer) {
    clearTimeout(lockTimer);
  }
  if (currentKey) {
    lockTimer = setTimeout(() => {
      clearKey();
    }, autoLockMinutes * 60 * 1000);
  }
}

export function setAutoLockMinutes(minutes: number): void {
  if (minutes > 0) {
    autoLockMinutes = minutes;
    touch();
  }
}

export function getAutoLockMinutes(): number {
  return autoLockMinutes;
}
