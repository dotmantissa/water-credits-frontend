import { inject, Injectable, InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface RemoteLoggingHook {
  (message: string, ...optionalParams: unknown[]): void;
}

export const REMOTE_LOGGING_HOOK = new InjectionToken<RemoteLoggingHook>('REMOTE_LOGGING_HOOK', {
  providedIn: 'root',
  factory:
    () =>
    (_message: string, ..._optionalParams: unknown[]): void => {
      // TODO: send to remote logging service
    },
});

@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private readonly isProduction = environment.production;
  private readonly remoteLoggingHook = inject(REMOTE_LOGGING_HOOK);

  info(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      console.log(`[INFO] ${message}`, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      console.warn(`[WARN] ${message}`, ...optionalParams);
    }
  }

  error(message: string, ...optionalParams: unknown[]): void {
    if (this.isProduction) {
      this.remoteLoggingHook(message, ...optionalParams);
      return;
    }

    console.error(`[ERROR] ${message}`, ...optionalParams);
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      console.debug(`[DEBUG] ${message}`, ...optionalParams);
    }
  }
}
