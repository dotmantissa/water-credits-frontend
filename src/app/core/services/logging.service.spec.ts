import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { LoggingService, REMOTE_LOGGING_HOOK, RemoteLoggingHook } from './logging.service';

describe('LoggingService', () => {
  const originalProduction = environment.production;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let remoteLoggingHook: ReturnType<typeof vi.fn<RemoteLoggingHook>>;

  function createService(isProduction: boolean): LoggingService {
    environment.production = isProduction;
    TestBed.configureTestingModule({
      providers: [{ provide: REMOTE_LOGGING_HOOK, useValue: remoteLoggingHook }],
    });

    return TestBed.inject(LoggingService);
  }

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    remoteLoggingHook = vi.fn<RemoteLoggingHook>();
  });

  afterEach(() => {
    environment.production = originalProduction;
    vi.restoreAllMocks();
  });

  describe('in development', () => {
    it('emits info logs to the console', () => {
      const service = createService(false);
      const context = { feature: 'wallet' };

      service.info('Connected', context);

      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Connected', context);
    });

    it('emits warning logs to the console', () => {
      const service = createService(false);
      const context = { feature: 'websocket' };

      service.warn('Connection unstable', context);

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Connection unstable', context);
    });

    it('emits error logs to the console', () => {
      const service = createService(false);
      const error = new Error('Request failed');

      service.error('Transaction failed', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Transaction failed', error);
      expect(remoteLoggingHook).not.toHaveBeenCalled();
    });
  });

  describe('in production', () => {
    it('suppresses info logs from the console', () => {
      const service = createService(true);

      service.info('Connected');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('suppresses warning logs from the console', () => {
      const service = createService(true);

      service.warn('Connection unstable');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('routes errors to the remote logging hook instead of the console', () => {
      const service = createService(true);
      const error = new Error('Request failed');
      const context = { transactionId: 'tx-123' };

      service.error('Transaction failed', error, context);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(remoteLoggingHook).toHaveBeenCalledWith('Transaction failed', error, context);
    });
  });
});
