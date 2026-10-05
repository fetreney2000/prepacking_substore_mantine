import { api } from './api';
import type { Group, Settings, SKU } from './types';

/**
 * Short-lived memo for the three lists almost every page loads — settings,
 * groups and skus (review item #20). Without it each navigation refetched
 * all three, so switching pages cost three round trips before a table could
 * render.
 *
 * Two rules keep it honest:
 *  - a short TTL bounds staleness (another user's edit shows up within 15s);
 *  - any mutation calls `invalidateCatalog()` first, so the acting user
 *    immediately sees their own change.
 *
 * Cache state lives in this module, i.e. per page load — a full reload
 * naturally starts clean.
 */
const TTL_MS = 15_000;

type Entry = { promise: Promise<unknown>; expires: number };
const cache = new Map<string, Entry>();

function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>;

  const entry: Entry = { promise: load(), expires: Date.now() + TTL_MS };
  cache.set(key, entry);
  // A rejected load must not be replayed for the rest of the TTL.
  entry.promise.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return entry.promise as Promise<T>;
}

export const catalog = {
  settings: () => memo('settings', api.settings.get),
  groups: () => memo('groups', api.groups.list),
  skus: () => memo('skus', api.skus.list),

  /** Everything the data-heavy pages need, in parallel. */
  all: async (): Promise<{ settings: Settings; groups: Group[]; skus: SKU[] }> => {
    const [settings, groups, skus] = await Promise.all([
      catalog.settings(),
      catalog.groups(),
      catalog.skus(),
    ]);
    return { settings, groups, skus };
  },
};

/**
 * Drop cached lists. Call it before refetching after any create, update,
 * delete or import — with no arguments every list is dropped, which is what
 * most callers want (the lists reference each other: a new SKU needs its
 * group, a new group needs its SKU count).
 */
export function invalidateCatalog(): void {
  cache.clear();
}
