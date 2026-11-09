type DbLockState = {
  acquisition: Promise<boolean> | null;
};

const dbLockStateKey = "__investSimulatorDbLockState";
const globalState = globalThis as typeof globalThis & {
  [dbLockStateKey]?: DbLockState;
};

const state: DbLockState = globalState[dbLockStateKey] ?? { acquisition: null };
globalState[dbLockStateKey] = state;

export function acquireDbLock(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    return Promise.resolve(true);
  }

  if (!state.acquisition) {
    state.acquisition = new Promise<boolean>((resolve) => {
      navigator.locks.request("db-owner", { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }

        resolve(true);
        return new Promise<never>(() => {});
      });
    });

    state.acquisition.then((acquired) => {
      if (!acquired) {
        state.acquisition = null;
      }
    });
  }

  return state.acquisition;
}
