import { ModuleRef } from '@nestjs/core';
import { runSystemResetWork } from './system-reset.work';
import { SystemResetParticipant } from './system-reset.participant';

describe('runSystemResetWork', () => {
  it('resolves the participant without requiring a feature-module import', async () => {
    const run = jest.fn(async (work: () => Promise<number>) => work());
    const get = jest.fn(() => ({ run }));
    expect(
      await runSystemResetWork({ get } as unknown as ModuleRef, () =>
        Promise.resolve(42),
      ),
    ).toBe(42);
    expect(get).toHaveBeenCalledWith(SystemResetParticipant, { strict: false });
  });

  it('does not execute when ModuleRef lookup throws', async () => {
    const work = jest.fn();
    const failure = new Error('provider unavailable');
    await expect(
      runSystemResetWork(
        {
          get: () => {
            throw failure;
          },
        } as unknown as ModuleRef,
        work,
      ),
    ).rejects.toBe(failure);
    expect(work).not.toHaveBeenCalled();
  });

  it('preserves execution failure for BullMQ retry instead of acknowledging success', async () => {
    const failure = new Error('physical work failed');
    const modules = {
      get: () => ({ run: async (work: () => Promise<unknown>) => work() }),
    };
    await expect(
      runSystemResetWork(modules as unknown as ModuleRef, () =>
        Promise.reject(failure),
      ),
    ).rejects.toBe(failure);
  });
});
