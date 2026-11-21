import { describe, expect, it } from 'vitest';
import { isInRecovery, nextEligibleDate } from '@/lib/donorRules';
import { CommunityError, createCommunityStore, maskPhone, seedInbox } from './communityStore';
import { hospitals } from './seed';

const demo = { userId: 'u-demo-1', name: { en: 'Ayesha Rahman', bn: 'আয়েশা রহমান' } };
const NOW = new Date(2026, 10, 21, 10, 0);

function makeStore(now = NOW) {
  let clock = now;
  const store = createCommunityStore(hospitals, demo, () => clock);
  return { store, setNow: (d: Date) => (clock = d) };
}

const request = (donorId: string, hours = 24) => ({
  donorId,
  patientBloodGroup: 'O+' as const,
  hospitalId: 'h-dhaka-1',
  unitsNeeded: 1,
  neededBy: new Date(NOW.getTime() + hours * 3_600_000).toISOString(),
  contactPhone: '01711112222',
  note: '',
});

describe('recovery-period rule', () => {
  it('whole blood: 90 days; platelets: 7 days; both: 90 days', () => {
    expect(nextEligibleDate('whole_blood', '2026-10-01')).toBe('2026-12-30');
    expect(nextEligibleDate('platelets', '2026-11-18')).toBe('2026-11-25');
    expect(nextEligibleDate('both', '2026-10-01')).toBe('2026-12-30');
    expect(nextEligibleDate('platelets', null)).toBeNull();
  });

  it('is in recovery until the eligible date', () => {
    expect(isInRecovery('whole_blood', '2026-09-01', NOW)).toBe(true); // 81 days ago
    expect(isInRecovery('whole_blood', '2026-08-20', NOW)).toBe(false); // 93 days ago
    expect(isInRecovery('platelets', '2026-11-18', NOW)).toBe(true); // 3 days ago
    expect(isInRecovery('platelets', '2026-11-14', NOW)).toBe(false); // exactly 7 days
    expect(isInRecovery('both', null, NOW)).toBe(false);
  });

  it('a profile saved inside the recovery period is not available, and cannot be turned on', () => {
    const { store } = makeStore();
    const profile = store.saveProfile(demo.userId, demo.name, {
      bloodGroup: 'A+',
      donationType: 'platelets',
      districtId: 'dhaka',
      lastDonationDate: '2026-11-19',
      phone: '01711112222',
      shareAfterAccept: true,
    });
    expect(profile.available).toBe(false);
    expect(() => store.setAvailability(demo.userId, true)).toThrow(CommunityError);
  });
});

describe('donor privacy', () => {
  it('masks phone numbers to the last three digits', () => {
    expect(maskPhone('01712345123')).toBe('01XXX-XXX-123');
    expect(maskPhone('+880 1712-345678')).toBe('01XXX-XXX-678');
  });

  it('public donor cards never include the phone number', () => {
    const { store } = makeStore();
    const donors = store.listDonors(demo.userId);
    expect(donors).toHaveLength(40);
    for (const donor of donors) {
      expect(donor).not.toHaveProperty('phone');
      expect(donor.maskedPhone).toMatch(/^01XXX-XXX-\d{3}$/);
      expect(JSON.stringify(donor)).not.toMatch(/0170000\d{4}/);
    }
  });

  it('the donor contact stays masked until the donor accepts', () => {
    const { store } = makeStore();
    const donorUser = 'u-donor-2';
    const sent = store.createRequest(demo.userId, demo.name, request('dn-seed-2'));
    expect(sent.status).toBe('sent');
    expect(sent.donorPhone).toBeNull();
    // The donor does not see the requester's number yet either.
    expect(store.inboxOf(donorUser)[0]?.contactPhone).toBeNull();

    store.respond(donorUser, sent.requestId, true);
    const mine = store.sentBy(demo.userId).find((r) => r.requestId === sent.requestId);
    expect(mine?.status).toBe('accepted');
    expect(mine?.donorPhone).toBe('01700001001');
    expect(store.inboxOf(donorUser)[0]?.contactPhone).toBe('01711112222');
  });

  it('a declined request never reveals the contact', () => {
    const { store } = makeStore();
    const sent = store.createRequest(demo.userId, demo.name, request('dn-seed-2'));
    store.respond('u-donor-2', sent.requestId, false);
    const mine = store.sentBy(demo.userId).find((r) => r.requestId === sent.requestId);
    expect(mine?.status).toBe('declined');
    expect(mine?.donorPhone).toBeNull();
  });
});

describe('request status changes', () => {
  it('Sent → Accepted → Fulfilled', () => {
    const { store } = makeStore();
    const sent = store.createRequest(demo.userId, demo.name, request('dn-seed-2'));
    expect(() => store.markFulfilled(demo.userId, sent.requestId)).toThrow(CommunityError);
    store.respond('u-donor-2', sent.requestId, true);
    expect(store.markFulfilled(demo.userId, sent.requestId).status).toBe('fulfilled');
  });

  it('open requests expire after their "needed by" time and cannot be answered', () => {
    const { store, setNow } = makeStore();
    const sent = store.createRequest(demo.userId, demo.name, request('dn-seed-2', 2));
    setNow(new Date(NOW.getTime() + 3 * 3_600_000));
    expect(store.sentBy(demo.userId).find((r) => r.requestId === sent.requestId)?.status).toBe(
      'expired',
    );
    expect(() => store.respond('u-donor-2', sent.requestId, true)).toThrow(CommunityError);
  });

  it('cannot request an unavailable donor or yourself', () => {
    const { store } = makeStore();
    // Every 4th seeded donor is unavailable.
    expect(() => store.createRequest(demo.userId, demo.name, request('dn-seed-4'))).toThrowError(
      'DONOR_UNAVAILABLE',
    );
  });

  it('seeds one request in each state for the demo user', () => {
    const { store } = makeStore();
    expect(
      store
        .sentBy(demo.userId)
        .map((r) => r.status)
        .sort(),
    ).toEqual(['accepted', 'declined', 'expired', 'fulfilled', 'sent']);
  });

  it('stores misuse reports', () => {
    const { store } = makeStore();
    const profile = store.saveProfile(demo.userId, demo.name, {
      bloodGroup: 'B+',
      donationType: 'whole_blood',
      districtId: 'dhaka',
      lastDonationDate: null,
      phone: '01711112222',
      shareAfterAccept: true,
    });
    seedInbox(store, profile.donorId, hospitals, NOW);
    const first = store.inboxOf(demo.userId)[0];
    store.reportMisuse(demo.userId, first?.requestId ?? '', 'payment', 'Asked for money');
    expect(store.misuse).toEqual([
      expect.objectContaining({ reason: 'payment', note: 'Asked for money' }),
    ]);
  });
});
