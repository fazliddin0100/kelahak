import { sweepExpiredSessions } from './lib/sessionFiles';

const globalTimers = globalThis as typeof globalThis & {
  __mexonSessionSweep?: boolean;
};

if (!globalTimers.__mexonSessionSweep) {
  globalTimers.__mexonSessionSweep = true;
  const timer = setInterval(() => {
    void sweepExpiredSessions().catch((error) => {
      console.error('Expired upload session sweep failed:', error);
    });
  }, 60_000);
  timer.unref?.();
}
