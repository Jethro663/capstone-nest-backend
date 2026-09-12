import { ServiceUnavailableException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SystemResetParticipant } from './system-reset.participant';

/** Resolve lazily to avoid a module import cycle; never run unowned work. */
export async function runSystemResetWork<T>(
  modules: ModuleRef | undefined,
  work: () => Promise<T>,
): Promise<T> {
  const participant = modules?.get<SystemResetParticipant>(
    SystemResetParticipant,
    { strict: false },
  );
  if (!participant) {
    throw new ServiceUnavailableException(
      'System reset participant unavailable',
    );
  }
  // run() inherits the originating request epoch and joins the actual promise.
  return await participant.run(work);
}
