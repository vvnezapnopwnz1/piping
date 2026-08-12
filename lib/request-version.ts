export interface RequestVersionToken {
  isCurrent(): boolean
}

export interface RequestVersion {
  start(): RequestVersionToken
  invalidate(): void
}

export function createRequestVersion(): RequestVersion {
  let currentVersion = 0

  return {
    start() {
      const requestVersion = ++currentVersion

      return {
        isCurrent: () => requestVersion === currentVersion,
      }
    },
    invalidate() {
      currentVersion += 1
    },
  }
}
