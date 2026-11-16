/**
 * In-memory booking engine for the mock API. All booking rules live here so they can be
 * unit-tested directly (FR10–FR13):
 *  - a slot never goes over capacity
 *  - the same person cannot book the same slot twice, or two slots at the same time
 *  - cancelling returns a place to the slot
 *  - rescheduling books the new slot first and only then releases the old one
 */
import { toIsoDate } from '@/lib/format';
import { BookingError } from '../errors';
import type { AppointmentStatus, Doctor, Slot, Weekday } from '../types';

export const SLOT_TIMES = ['09:00', '10:30', '15:00', '18:00'] as const;
export const SLOT_CAPACITY = 10;

export interface StoredAppointment {
  appointmentId: string;
  userId: string;
  slotId: string;
  serialNo: number;
  status: AppointmentStatus;
  patientName: string;
}

interface SlotState extends Slot {
  /** Highest serial handed out; serials are never reused, even after cancellations. */
  lastSerial: number;
}

export interface BookingStoreOptions {
  doctors: Doctor[];
  /** Places already taken when a slot is first seen (simulated demand). */
  initialBooked?: (slotId: string) => number;
  capacity?: number;
}

export { toIsoDate };

/** Slot ids encode doctor, date and time: `<doctorId>_<yyyymmdd>_<hhmm>`. */
export function makeSlotId(doctorId: string, isoDate: string, time: string): string {
  return `${doctorId}_${isoDate.replace(/-/g, '')}_${time.replace(':', '')}`;
}

function parseSlotId(slotId: string) {
  const match = /^(.+)_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/.exec(slotId);
  if (!match) return null;
  const [, doctorId, y, m, d, hh, mm] = match;
  if (!doctorId) return null;
  const start = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
  return { doctorId, start, time: `${hh}:${mm}` };
}

export class BookingStore {
  private readonly doctors: Map<string, Doctor>;
  private readonly slots = new Map<string, SlotState>();
  private readonly appointments: StoredAppointment[] = [];
  private readonly initialBooked: (slotId: string) => number;
  private readonly capacity: number;
  private nextId = 1;

  constructor(options: BookingStoreOptions) {
    this.doctors = new Map(options.doctors.map((d) => [d.doctorId, d]));
    this.initialBooked = options.initialBooked ?? (() => 0);
    this.capacity = options.capacity ?? SLOT_CAPACITY;
  }

  /** Returns the live slot, creating it on first use. Throws SLOT_NOT_FOUND for invalid ids. */
  getSlot(slotId: string): Slot {
    return { ...this.slotState(slotId) };
  }

  private slotState(slotId: string): SlotState {
    const existing = this.slots.get(slotId);
    if (existing) return existing;
    const parsed = parseSlotId(slotId);
    const doctor = parsed && this.doctors.get(parsed.doctorId);
    if (
      !parsed ||
      !doctor ||
      !(SLOT_TIMES as readonly string[]).includes(parsed.time) ||
      !doctor.availableDays.includes(parsed.start.getDay() as Weekday)
    ) {
      throw new BookingError('SLOT_NOT_FOUND');
    }
    const booked = Math.min(this.capacity, Math.max(0, this.initialBooked(slotId)));
    const state: SlotState = {
      slotId,
      doctorId: doctor.doctorId,
      hospitalId: doctor.hospitalId,
      start: parsed.start.toISOString(),
      capacity: this.capacity,
      booked,
      lastSerial: booked,
    };
    this.slots.set(slotId, state);
    return state;
  }

  /** Bookable slots for a doctor on a date (none on days off; past times excluded). */
  listSlots(doctorId: string, isoDate: string, now: Date): Slot[] {
    const doctor = this.doctors.get(doctorId);
    if (!doctor) return [];
    const [y = 1970, m = 1, d = 1] = isoDate.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).getDay() as Weekday;
    if (!doctor.availableDays.includes(weekday)) return [];
    return SLOT_TIMES.map((time) => this.getSlot(makeSlotId(doctorId, isoDate, time))).filter(
      (slot) => new Date(slot.start) > now,
    );
  }

  appointmentsFor(userId: string): StoredAppointment[] {
    return this.appointments.filter((a) => a.userId === userId).map((a) => ({ ...a }));
  }

  private activeFor(userId: string, exceptId?: string) {
    return this.appointments.filter(
      (a) => a.userId === userId && a.status === 'booked' && a.appointmentId !== exceptId,
    );
  }

  private find(appointmentId: string, userId: string): StoredAppointment {
    const appointment = this.appointments.find(
      (a) => a.appointmentId === appointmentId && a.userId === userId,
    );
    if (!appointment) throw new BookingError('APPOINTMENT_NOT_FOUND');
    return appointment;
  }

  /** All checks for putting `userId` into `slot`; throws before anything changes. */
  private assertBookable(slot: SlotState, userId: string, now: Date, exceptId?: string) {
    if (new Date(slot.start) <= now) throw new BookingError('SLOT_IN_PAST');
    const active = this.activeFor(userId, exceptId);
    if (active.some((a) => a.slotId === slot.slotId)) throw new BookingError('DUPLICATE_BOOKING');
    if (active.some((a) => this.slotState(a.slotId).start === slot.start)) {
      throw new BookingError('TIME_CONFLICT');
    }
    if (slot.booked >= slot.capacity) throw new BookingError('SLOT_FULL');
  }

  book(input: {
    userId: string;
    slotId: string;
    patientName: string;
    now: Date;
  }): StoredAppointment {
    const slot = this.slotState(input.slotId);
    this.assertBookable(slot, input.userId, input.now);
    slot.booked += 1;
    slot.lastSerial += 1;
    const appointment: StoredAppointment = {
      appointmentId: `a-${this.nextId++}`,
      userId: input.userId,
      slotId: slot.slotId,
      serialNo: slot.lastSerial,
      status: 'booked',
      patientName: input.patientName,
    };
    this.appointments.push(appointment);
    return { ...appointment };
  }

  cancel(appointmentId: string, userId: string): StoredAppointment {
    const appointment = this.find(appointmentId, userId);
    if (appointment.status !== 'booked') throw new BookingError('NOT_ACTIVE');
    appointment.status = 'cancelled';
    const slot = this.slotState(appointment.slotId);
    slot.booked = Math.max(0, slot.booked - 1);
    return { ...appointment };
  }

  /** Book the new slot first; the old place is released only if that succeeds. */
  reschedule(input: {
    appointmentId: string;
    userId: string;
    newSlotId: string;
    now: Date;
  }): StoredAppointment {
    const appointment = this.find(input.appointmentId, input.userId);
    if (appointment.status !== 'booked') throw new BookingError('NOT_ACTIVE');
    const next = this.slotState(input.newSlotId);
    if (next.slotId === appointment.slotId) throw new BookingError('DUPLICATE_BOOKING');
    this.assertBookable(next, input.userId, input.now, appointment.appointmentId);

    next.booked += 1;
    next.lastSerial += 1;
    const old = this.slotState(appointment.slotId);
    old.booked = Math.max(0, old.booked - 1);
    appointment.slotId = next.slotId;
    appointment.serialNo = next.lastSerial;
    return { ...appointment };
  }

  /** Test/dev helper: someone else takes every remaining place (mock race). */
  fillSlot(slotId: string) {
    const slot = this.slotState(slotId);
    slot.lastSerial += slot.capacity - slot.booked;
    slot.booked = slot.capacity;
  }

  /** Seed helper: record a historical or pre-existing appointment without the live rules. */
  seed(appointment: Omit<StoredAppointment, 'appointmentId' | 'serialNo'> & { serialNo?: number }) {
    const slot = this.slotState(appointment.slotId);
    let serialNo = appointment.serialNo ?? slot.lastSerial + 1;
    if (appointment.status === 'booked') {
      if (slot.booked >= slot.capacity) slot.booked = slot.capacity - 1;
      slot.booked += 1;
      slot.lastSerial = Math.max(slot.lastSerial, serialNo);
    }
    serialNo = Math.max(1, serialNo);
    const stored: StoredAppointment = {
      ...appointment,
      appointmentId: `a-${this.nextId++}`,
      serialNo,
    };
    this.appointments.push(stored);
    return { ...stored };
  }
}
