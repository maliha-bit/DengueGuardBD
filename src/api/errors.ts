/** Business-rule errors from the booking API (409 responses in the real backend). */
export type BookingErrorCode =
  | 'SLOT_FULL'
  | 'DUPLICATE_BOOKING'
  | 'TIME_CONFLICT'
  | 'SLOT_IN_PAST'
  | 'SLOT_NOT_FOUND'
  | 'APPOINTMENT_NOT_FOUND'
  | 'NOT_ACTIVE';

export class BookingError extends Error {
  constructor(readonly code: BookingErrorCode) {
    super(code);
    this.name = 'BookingError';
  }
}

export const isBookingError = (error: unknown): error is BookingError =>
  error instanceof BookingError;
