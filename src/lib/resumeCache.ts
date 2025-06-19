type CacheEntry = {
  id: string;
  name: string;
  timestamp: number;
};

const STORAGE_KEY = "resumeCache";
const MAX_ENTRIES = 10; // The max amount of resumes in the cache at once

function readCache(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(entries: CacheEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Add a resume to the cache, evicting the oldest if we're full */
// LRU Cache
export function addToCache(entry: CacheEntry) {
    const cache = readCache();

    // remove existing with same id
    const filtered = cache.filter((e) => e.id !== entry.id);

    // add new to front
    filtered.unshift(entry);

    // enforce max size
     if (filtered.length > MAX_ENTRIES) {
        filtered.pop();
    }

    writeCache(filtered);
}

/** Get one resume (by id) or null */
export function getCachedResume(id: string): CacheEntry | null {
    const cache = readCache();
    return cache.find((e) => e.id === id) || null;
}

/** Get all IDs/names in cache (most‐recent first) */
export function listCachedResumes(): CacheEntry[] {
    return readCache();
}

/** Remove a resume from the cache by its id */
export function removeFromCache(id: string) {
  const entries = readCache().filter(e => e.id !== id);
  writeCache(entries);
}