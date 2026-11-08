let blockers = 0;

export function acquireNavigationSwipeLock() {
  blockers += 1;
  return () => {
    blockers = Math.max(blockers - 1, 0);
  };
}

export function isNavigationSwipeLocked() {
  return blockers > 0;
}
