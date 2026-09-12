import { EventEmitter } from 'node:events';
import { Subject } from 'rxjs';
import {
  SystemResetInterceptor,
  isResetControlRequest,
} from './system-reset.interceptor';
import {
  getResetRequestEpoch,
  getResetStorageGeneration,
  resetStorageFilename,
  resetStorageKey,
  runResetWorkContext,
} from './system-reset.context';

describe('reset HTTP drain', () => {
  it('only exempts exact read-only health/status and reset control routes', () => {
    expect(isResetControlRequest('GET', '/api/system-maintenance')).toBe(true);
    expect(isResetControlRequest('GET', '/api/health/ready')).toBe(true);
    expect(isResetControlRequest('POST', '/api/health')).toBe(false);
    expect(
      isResetControlRequest('POST', '/api/admin/system-reset/execute'),
    ).toBe(true);
    expect(isResetControlRequest('POST', '/api/admin/system-reset-other')).toBe(
      false,
    );
    expect(isResetControlRequest('POST', '/api/auth/login')).toBe(false);
  });
  it('does not release a cancelled request until its actual handler settles', async () => {
    const response = new EventEmitter();
    const source = new Subject();
    let active = false;
    let drained!: () => void;
    const done = new Promise<void>((resolve) => {
      drained = resolve;
    });
    const participant = {
      run: async (work: () => Promise<void>) => {
        active = true;
        try {
          await work();
        } finally {
          active = false;
          drained();
        }
      },
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/files',
          resetEpoch: 1,
        }),
        getResponse: () => response,
      }),
    };
    const subscription = new SystemResetInterceptor(participant as any)
      .intercept(context as any, { handle: () => source })
      .subscribe();
    expect(active).toBe(true);
    subscription.unsubscribe();
    response.emit('close');
    await Promise.resolve();
    expect(active).toBe(true);
    source.complete();
    await done;
    expect(active).toBe(false);
  });
  it('retains a manual streaming response lease after its controller returns', async () => {
    const response = new EventEmitter();
    const source = new Subject();
    let active = false;
    let drained!: () => void;
    const done = new Promise<void>((resolve) => {
      drained = resolve;
    });
    const participant = {
      run: async (work: () => Promise<void>) => {
        active = true;
        try {
          await work();
        } finally {
          active = false;
          drained();
        }
      },
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: '/api/files/file' }),
        getResponse: () => response,
      }),
    };
    new SystemResetInterceptor(participant as any)
      .intercept(context as any, { handle: () => source })
      .subscribe();
    source.complete();
    await Promise.resolve();
    expect(active).toBe(true);
    response.emit('finish');
    await done;
    expect(active).toBe(false);
  });
  it('carries the original epoch into delayed continuations without leaking it', async () => {
    let delayed!: Promise<number | undefined>;
    runResetWorkContext(7, () => {
      delayed = new Promise((resolve) =>
        setImmediate(() => resolve(getResetRequestEpoch())),
      );
    });
    expect(getResetRequestEpoch()).toBeUndefined();
    expect(await delayed).toBe(7);
  });
  it('server-scopes object keys and direct-upload filenames to the admitted generation', () => {
    runResetWorkContext(
      { epoch: 8, storageGeneration: 'g-operation' },
      () => {
        expect(getResetStorageGeneration()).toBe('g-operation');
        expect(resetStorageKey('library/source.pdf')).toBe(
          'g-operation/library/source.pdf',
        );
        expect(resetStorageFilename('source.pdf')).toBe(
          'g-operation_source.pdf',
        );
        expect(() => resetStorageKey('__nexora_control/storage-owner')).toThrow(
          'Unsafe upload storage key',
        );
      },
    );
  });
});
