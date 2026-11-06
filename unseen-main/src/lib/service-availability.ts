export class ServiceRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ServiceRequestError';
  }
}

export const isServiceRestricted = (error: unknown): boolean =>
  error instanceof ServiceRequestError && error.status === 402;
