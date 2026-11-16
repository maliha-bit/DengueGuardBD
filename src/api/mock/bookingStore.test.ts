import { describe, expect, it } from 'vitest';
import { BookingError, type BookingErrorCode } from '../errors';
import type { Doctor } from '../types';
import { BookingStore, makeSlotId } from './bookingStore';

// Wednesday 18 Nov 2026, 08:00 local time. The doctor works every day.
const NOW = new Date(2026, 10, 18, 8, 0);
const doctor: Doctor = {
  doctorId: 'd-1',
  hospitalId: 'h-1',
  name: { en: 'Dr. Test', bn: 'ডা. টেস্ট' },
  specialty: { en: 'Medicine', bn: 'মেডিসিন' },
  availableDays: [0, 1, 2, 3, 4, 5, 6],
};
const morning = makeSlotId('d-1', '2026-11-19', '09:00');
const evening = makeSlotId('d-1', '2026-11-19', '18:00');
const otherDay = makeSlotId('d-1', '2026-11-20', '10:30');

function newStore(capacity = 3) {
  return new BookingStore({ doctors: [doctor], capacity });
}

function expectCode(fn: () => unknown, code: BookingErrorCode) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BookingError);
    expect((error as BookingError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
}

describe('BookingStore: capacity', () => {
  it('never lets a slot go over capacity', () => {
    const store = newStore(3);
    for (let i = 0; i < 3; i++) {
      store.book({ userId: `u${i}`, slotId: morning, patientName: 'P', now: NOW });
    }
    expect(store.getSlot(morning).booked).toBe(3);
    expectCode(
      () => store.book({ userId: 'u-late', slotId: morning, patientName: 'P', now: NOW }),
      'SLOT_FULL',
    );
    expect(store.getSlot(morning).booked).toBe(3);
  });

  it('respects places already taken (seeded demand)', () => {
    const store = new BookingStore({ doctors: [doctor], capacity: 10, initialBooked: () => 9 });
    store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    expectCode(
      () => store.book({ userId: 'u2', slotId: morning, patientName: 'P', now: NOW }),
      'SLOT_FULL',
    );
    expect(store.getSlot(morning).booked).toBe(10);
  });

  it('hands out increasing, never-reused serial numbers', () => {
    const store = newStore(3);
    const a = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    const b = store.book({ userId: 'u2', slotId: morning, patientName: 'P', now: NOW });
    store.cancel(a.appointmentId, 'u1');
    const c = store.book({ userId: 'u3', slotId: morning, patientName: 'P', now: NOW });
    expect([a.serialNo, b.serialNo, c.serialNo]).toEqual([1, 2, 3]);
  });

  it('rejects slots in the past and unknown slots', () => {
    const store = newStore();
    const later = new Date(2026, 10, 19, 12, 0);
    expectCode(
      () => store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: later }),
      'SLOT_IN_PAST',
    );
    expectCode(() => store.getSlot('nonsense'), 'SLOT_NOT_FOUND');
    expectCode(() => store.getSlot(makeSlotId('d-1', '2026-11-19', '11:11')), 'SLOT_NOT_FOUND');
  });
});

describe('BookingStore: double booking', () => {
  it('blocks the same person booking the same slot twice', () => {
    const store = newStore();
    store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    expectCode(
      () => store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW }),
      'DUPLICATE_BOOKING',
    );
    expect(store.getSlot(morning).booked).toBe(1);
  });

  it('blocks two appointments at the same time with different doctors', () => {
    const second: Doctor = { ...doctor, doctorId: 'd-2' };
    const store = new BookingStore({ doctors: [doctor, second], capacity: 5 });
    store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    expectCode(
      () =>
        store.book({
          userId: 'u1',
          slotId: makeSlotId('d-2', '2026-11-19', '09:00'),
          patientName: 'P',
          now: NOW,
        }),
      'TIME_CONFLICT',
    );
  });

  it('allows booking the same slot again after cancelling', () => {
    const store = newStore();
    const first = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    store.cancel(first.appointmentId, 'u1');
    expect(() =>
      store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW }),
    ).not.toThrow();
  });
});

describe('BookingStore: cancel', () => {
  it('releases a place back to the slot', () => {
    const store = newStore(3);
    const appointment = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    expect(store.getSlot(morning).booked).toBe(1);
    const cancelled = store.cancel(appointment.appointmentId, 'u1');
    expect(cancelled.status).toBe('cancelled');
    expect(store.getSlot(morning).booked).toBe(0);
  });

  it('lets someone else take the released place in a full slot', () => {
    const store = newStore(1);
    const appointment = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    store.cancel(appointment.appointmentId, 'u1');
    expect(() =>
      store.book({ userId: 'u2', slotId: morning, patientName: 'P', now: NOW }),
    ).not.toThrow();
  });

  it('cannot cancel twice or cancel someone else’s appointment', () => {
    const store = newStore();
    const appointment = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    store.cancel(appointment.appointmentId, 'u1');
    expectCode(() => store.cancel(appointment.appointmentId, 'u1'), 'NOT_ACTIVE');
    expect(store.getSlot(morning).booked).toBe(0);
    expectCode(() => store.cancel(appointment.appointmentId, 'u2'), 'APPOINTMENT_NOT_FOUND');
  });
});

describe('BookingStore: reschedule', () => {
  it('moves the booking, then releases the old place', () => {
    const store = newStore(3);
    const appointment = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    const moved = store.reschedule({
      appointmentId: appointment.appointmentId,
      userId: 'u1',
      newSlotId: evening,
      now: NOW,
    });
    expect(moved.slotId).toBe(evening);
    expect(moved.appointmentId).toBe(appointment.appointmentId);
    expect(store.getSlot(evening).booked).toBe(1);
    expect(store.getSlot(morning).booked).toBe(0);
  });

  it('keeps the old slot when the new booking fails (new slot full)', () => {
    const store = newStore(1);
    const mine = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    store.book({ userId: 'u2', slotId: evening, patientName: 'P', now: NOW });
    expectCode(
      () =>
        store.reschedule({
          appointmentId: mine.appointmentId,
          userId: 'u1',
          newSlotId: evening,
          now: NOW,
        }),
      'SLOT_FULL',
    );
    const [unchanged] = store.appointmentsFor('u1');
    expect(unchanged?.slotId).toBe(morning);
    expect(unchanged?.status).toBe('booked');
    expect(store.getSlot(morning).booked).toBe(1);
    expect(store.getSlot(evening).booked).toBe(1);
  });

  it('keeps the old slot when the new time clashes with another appointment', () => {
    const store = newStore(3);
    const first = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    store.book({ userId: 'u1', slotId: otherDay, patientName: 'P', now: NOW });
    expectCode(
      () =>
        store.reschedule({
          appointmentId: first.appointmentId,
          userId: 'u1',
          newSlotId: otherDay,
          now: NOW,
        }),
      'DUPLICATE_BOOKING',
    );
    expect(store.getSlot(morning).booked).toBe(1);
    expect(store.getSlot(otherDay).booked).toBe(1);
  });

  it('cannot reschedule to the same slot or a cancelled appointment', () => {
    const store = newStore();
    const appointment = store.book({ userId: 'u1', slotId: morning, patientName: 'P', now: NOW });
    expectCode(
      () =>
        store.reschedule({
          appointmentId: appointment.appointmentId,
          userId: 'u1',
          newSlotId: morning,
          now: NOW,
        }),
      'DUPLICATE_BOOKING',
    );
    store.cancel(appointment.appointmentId, 'u1');
    expectCode(
      () =>
        store.reschedule({
          appointmentId: appointment.appointmentId,
          userId: 'u1',
          newSlotId: evening,
          now: NOW,
        }),
      'NOT_ACTIVE',
    );
  });
});

describe('BookingStore: listing slots', () => {
  it('lists the four daily sessions and hides past times', () => {
    const store = newStore();
    expect(store.listSlots('d-1', '2026-11-19', NOW)).toHaveLength(4);
    const lateMorning = new Date(2026, 10, 19, 11, 0);
    expect(store.listSlots('d-1', '2026-11-19', lateMorning).map((s) => s.start)).toHaveLength(2);
  });

  it('returns nothing on the doctor’s day off', () => {
    const weekdaysOnly: Doctor = { ...doctor, availableDays: [6, 0, 1, 2, 3, 4] };
    const store = new BookingStore({ doctors: [weekdaysOnly] });
    // 20 Nov 2026 is a Friday.
    expect(store.listSlots('d-1', '2026-11-20', NOW)).toEqual([]);
  });
});
