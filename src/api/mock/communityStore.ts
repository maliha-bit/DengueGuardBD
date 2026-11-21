/**
 * In-memory donors, donor requests, misuse reports and breeding-site reports for the mock
 * API (SIMULATED: fictional people and numbers). The privacy rules live here, like the
 * backend will enforce them: public donor cards get a masked phone, and phone numbers are
 * exchanged only after the donor accepts a request.
 */
import { isInRecovery } from '@/lib/donorRules';
import { REPORT_TRANSITIONS } from '@/lib/reports';
import { toIsoDate } from '@/lib/format';
import type {
  BloodGroup,
  BreedingReport,
  BreedingReportInput,
  BreedingReportStatus,
  DonationType,
  DonorListing,
  DonorProfile,
  DonorProfileInput,
  DonorRequest,
  DonorRequestInput,
  DonorRequestStatus,
  Hospital,
  LocalizedText,
  MisuseReason,
} from '../types';
import { divisions } from './seed';

export type CommunityErrorCode =
  | 'NOT_FOUND'
  | 'NOT_A_DONOR'
  | 'DONOR_UNAVAILABLE'
  | 'OWN_PROFILE'
  | 'INVALID_STATUS'
  | 'IN_RECOVERY';

export class CommunityError extends Error {
  constructor(readonly code: CommunityErrorCode) {
    super(code);
    this.name = 'CommunityError';
  }
}

/** "01712345123" → "01XXX-XXX-123". Never reveals more than the last three digits. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return `01XXX-XXX-${digits.slice(-3).padStart(3, 'X')}`;
}

const districtIndex = new Map(
  divisions.flatMap((div) =>
    div.districts.map((d) => [d.districtId, { divisionId: div.divisionId, name: d.name }] as const),
  ),
);

export function districtInfo(districtId: string) {
  const info = districtIndex.get(districtId);
  if (!info) throw new CommunityError('NOT_FOUND');
  return info;
}

interface StoredRequest extends DonorRequestInput {
  requestId: string;
  requesterId: string;
  requesterName: LocalizedText;
  status: DonorRequestStatus;
  createdAt: string;
  respondedAt: string | null;
  closedAt: string | null;
}

export interface MisuseRecord {
  requestId: string;
  reporterId: string;
  reason: MisuseReason;
  note: string;
  createdAt: string;
}

const CONTACT_VISIBLE: DonorRequestStatus[] = ['accepted', 'fulfilled'];

export class CommunityStore {
  private donors: DonorProfile[] = [];
  private requests: StoredRequest[] = [];
  private reports: BreedingReport[] = [];
  readonly misuse: MisuseRecord[] = [];
  private nextId = 1;
  private nextReference = 120;

  constructor(
    private readonly hospitals: Hospital[],
    private readonly now: () => Date,
  ) {}

  /* ---------- donors ---------- */

  addDonor(profile: DonorProfile) {
    this.donors.push(profile);
  }

  private listing(profile: DonorProfile): DonorListing {
    return {
      donorId: profile.donorId,
      name: profile.name,
      bloodGroup: profile.bloodGroup,
      donationType: profile.donationType,
      divisionId: profile.divisionId,
      districtId: profile.districtId,
      district: profile.district,
      lastDonationDate: profile.lastDonationDate,
      available: profile.available,
      lastActiveAt: profile.lastActiveAt,
      maskedPhone: maskPhone(profile.phone),
    };
  }

  /** Public donor cards (masked phones). The user's own profile is left out. */
  listDonors(viewerId: string | null): DonorListing[] {
    return this.donors.filter((d) => d.userId !== viewerId).map((d) => this.listing(d));
  }

  getProfile(userId: string): DonorProfile | null {
    const profile = this.donors.find((d) => d.userId === userId);
    return profile ? { ...profile } : null;
  }

  saveProfile(userId: string, name: LocalizedText, input: DonorProfileInput): DonorProfile {
    const { divisionId, name: district } = districtInfo(input.districtId);
    const existing = this.donors.find((d) => d.userId === userId);
    const profile: DonorProfile = {
      donorId: existing?.donorId ?? `dn-${this.nextId++}`,
      userId,
      name,
      ...input,
      divisionId,
      district,
      // Donors still in their recovery period cannot be listed as available.
      available: isInRecovery(input.donationType, input.lastDonationDate, this.now())
        ? false
        : (existing?.available ?? true),
      lastActiveAt: this.now().toISOString(),
    };
    if (existing) Object.assign(existing, profile);
    else this.donors.push(profile);
    return { ...profile };
  }

  setAvailability(userId: string, available: boolean): DonorProfile {
    const profile = this.donors.find((d) => d.userId === userId);
    if (!profile) throw new CommunityError('NOT_A_DONOR');
    if (available && isInRecovery(profile.donationType, profile.lastDonationDate, this.now())) {
      throw new CommunityError('IN_RECOVERY');
    }
    profile.available = available;
    profile.lastActiveAt = this.now().toISOString();
    return { ...profile };
  }

  /* ---------- requests ---------- */

  /** Requests past their "needed by" time that were never fulfilled expire. */
  private effectiveStatus(r: StoredRequest): DonorRequestStatus {
    if ((r.status === 'sent' || r.status === 'accepted') && new Date(r.neededBy) < this.now()) {
      return 'expired';
    }
    return r.status;
  }

  private view(r: StoredRequest, as: 'requester' | 'donor'): DonorRequest {
    const donor = this.donors.find((d) => d.donorId === r.donorId);
    const hospital = this.hospitals.find((h) => h.hospitalId === r.hospitalId);
    if (!donor || !hospital) throw new CommunityError('NOT_FOUND');
    const status = this.effectiveStatus(r);
    const visible = CONTACT_VISIBLE.includes(status);
    return {
      requestId: r.requestId,
      requesterId: r.requesterId,
      requesterName: r.requesterName,
      donorId: r.donorId,
      patientBloodGroup: r.patientBloodGroup,
      hospitalId: r.hospitalId,
      hospital,
      unitsNeeded: r.unitsNeeded,
      neededBy: r.neededBy,
      note: r.note,
      donor: this.listing(donor),
      status,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      closedAt: r.closedAt,
      donorPhone: as === 'requester' && visible ? donor.phone : null,
      contactPhone: as === 'donor' && visible ? r.contactPhone : null,
    };
  }

  /** Requests the user sent (newest first). */
  sentBy(userId: string): DonorRequest[] {
    return this.requests
      .filter((r) => r.requesterId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => this.view(r, 'requester'));
  }

  /** Requests to the user's donor profile (newest first). */
  inboxOf(userId: string): DonorRequest[] {
    const profile = this.donors.find((d) => d.userId === userId);
    if (!profile) throw new CommunityError('NOT_A_DONOR');
    return this.requests
      .filter((r) => r.donorId === profile.donorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => this.view(r, 'donor'));
  }

  createRequest(
    requesterId: string,
    requesterName: LocalizedText,
    input: DonorRequestInput,
    seed?: Partial<StoredRequest>,
  ): DonorRequest {
    const donor = this.donors.find((d) => d.donorId === input.donorId);
    if (!donor) throw new CommunityError('NOT_FOUND');
    if (donor.userId === requesterId) throw new CommunityError('OWN_PROFILE');
    if (!seed && !donor.available) throw new CommunityError('DONOR_UNAVAILABLE');
    const stored: StoredRequest = {
      ...input,
      requestId: `dr-${this.nextId++}`,
      requesterId,
      requesterName,
      status: 'sent',
      createdAt: this.now().toISOString(),
      respondedAt: null,
      closedAt: null,
      ...seed,
    };
    this.requests.push(stored);
    return this.view(stored, 'requester');
  }

  private findRequest(requestId: string) {
    const r = this.requests.find((x) => x.requestId === requestId);
    if (!r) throw new CommunityError('NOT_FOUND');
    return r;
  }

  /** The donor accepts or declines a request that is still open. */
  respond(donorUserId: string, requestId: string, accept: boolean): DonorRequest {
    const profile = this.donors.find((d) => d.userId === donorUserId);
    const r = this.findRequest(requestId);
    if (!profile || r.donorId !== profile.donorId) throw new CommunityError('NOT_FOUND');
    if (this.effectiveStatus(r) !== 'sent') throw new CommunityError('INVALID_STATUS');
    r.status = accept ? 'accepted' : 'declined';
    r.respondedAt = this.now().toISOString();
    return this.view(r, 'donor');
  }

  /** The requester confirms the donation happened. */
  markFulfilled(requesterId: string, requestId: string): DonorRequest {
    const r = this.findRequest(requestId);
    if (r.requesterId !== requesterId) throw new CommunityError('NOT_FOUND');
    if (this.effectiveStatus(r) !== 'accepted') throw new CommunityError('INVALID_STATUS');
    r.status = 'fulfilled';
    r.closedAt = this.now().toISOString();
    return this.view(r, 'requester');
  }

  reportMisuse(reporterId: string, requestId: string, reason: MisuseReason, note: string) {
    this.findRequest(requestId);
    const record: MisuseRecord = {
      requestId,
      reporterId,
      reason,
      note,
      createdAt: this.now().toISOString(),
    };
    this.misuse.push(record);
    return { ...record };
  }

  /** Admin directory: every donor (masked phones). */
  allDonors(): DonorListing[] {
    return this.donors.map((d) => this.listing(d));
  }

  /** Admin edit of a donor's name and phone. */
  updateDonor(donorId: string, name: LocalizedText, phone: string): DonorListing {
    const donor = this.donors.find((d) => d.donorId === donorId);
    if (!donor) throw new CommunityError('NOT_FOUND');
    donor.name = name;
    donor.phone = phone;
    return this.listing(donor);
  }

  /* ---------- breeding-site reports ---------- */

  /** Health authority: every report, newest first. */
  allReports(): BreedingReport[] {
    return [...this.reports]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r }));
  }

  /**
   * Health authority review: Submitted → Under review → Action taken / Rejected.
   * The citizen's "My reports" timeline reads the same record.
   */
  setReportStatus(reportId: string, status: BreedingReportStatus, note: string): BreedingReport {
    const report = this.reports.find((r) => r.reportId === reportId);
    if (!report) throw new CommunityError('NOT_FOUND');
    if (!REPORT_TRANSITIONS[report.status].includes(status)) {
      throw new CommunityError('INVALID_STATUS');
    }
    report.status = status;
    report.statusNote = note.trim() || undefined;
    report.updatedAt = this.now().toISOString();
    return { ...report };
  }

  reportsOf(userId: string): BreedingReport[] {
    return this.reports
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r }));
  }

  addReport(
    userId: string,
    input: BreedingReportInput,
    seed?: Partial<BreedingReport>,
  ): BreedingReport {
    const now = this.now();
    const report: BreedingReport = {
      ...input,
      reportId: `br-${this.nextId++}`,
      reference: `BR-${now.getFullYear()}-${String(this.nextReference++).padStart(6, '0')}`,
      userId,
      status: 'submitted',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...seed,
    };
    this.reports.push(report);
    return { ...report };
  }
}

/* ---------- seed (SIMULATED) ---------- */

const FIRST: LocalizedText[] = [
  { en: 'Rahim', bn: 'রহিম' },
  { en: 'Nadia', bn: 'নাদিয়া' },
  { en: 'Sohel', bn: 'সোহেল' },
  { en: 'Tania', bn: 'তানিয়া' },
  { en: 'Arif', bn: 'আরিফ' },
  { en: 'Mitu', bn: 'মিতু' },
  { en: 'Kamal', bn: 'কামাল' },
  { en: 'Shathi', bn: 'সাথী' },
  { en: 'Jamal', bn: 'জামাল' },
  { en: 'Ruma', bn: 'রুমা' },
];
const LAST: LocalizedText[] = [
  { en: 'Hossain', bn: 'হোসেন' },
  { en: 'Akter', bn: 'আক্তার' },
  { en: 'Islam', bn: 'ইসলাম' },
  { en: 'Rahman', bn: 'রহমান' },
];
const GROUPS: BloodGroup[] = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
const TYPES: DonationType[] = ['whole_blood', 'platelets', 'both'];
const DONOR_COUNT = 40;

export function createCommunityStore(
  hospitals: Hospital[],
  demoUser: { userId: string; name: LocalizedText },
  now: () => Date,
): CommunityStore {
  const store = new CommunityStore(hospitals, now);
  const start = now();
  const daysAgo = (days: number) => {
    const d = new Date(start);
    d.setDate(d.getDate() - days);
    return toIsoDate(d);
  };
  const hoursFromNow = (hours: number) =>
    new Date(start.getTime() + hours * 3_600_000).toISOString();
  const allDistricts = divisions.flatMap((div) => div.districts.map((d) => d.districtId));

  for (let i = 0; i < DONOR_COUNT; i++) {
    const first = FIRST[i % FIRST.length] ?? { en: 'Donor', bn: 'দাতা' };
    const last = LAST[(i * 3) % LAST.length] ?? { en: '', bn: '' };
    const districtId = allDistricts[(i * 5) % allDistricts.length] ?? 'dhaka';
    const { divisionId, name: district } = districtInfo(districtId);
    const lastDays = [200, 30, 120, 3, 95, 15, 400, 60][i % 8] ?? 200;
    store.addDonor({
      donorId: `dn-seed-${i + 1}`,
      userId: `u-donor-${i + 1}`,
      name: { en: `${first.en} ${last.en}`, bn: `${first.bn} ${last.bn}` },
      bloodGroup: GROUPS[i % GROUPS.length] ?? 'O+',
      donationType: TYPES[i % TYPES.length] ?? 'both',
      divisionId,
      districtId,
      district,
      lastDonationDate: i % 7 === 6 ? null : daysAgo(lastDays),
      // Deliberately fake numbers (simulated).
      phone: `0170000${String(1000 + i).slice(-4)}`,
      shareAfterAccept: true,
      available: i % 4 !== 3,
      lastActiveAt: new Date(start.getTime() - (10 + i * 37) * 60_000).toISOString(),
    });
  }

  // The demo user's own requests, one in each state.
  const me = demoUser.userId;
  const hospital = (id: string) => hospitals.find((h) => h.hospitalId === id)?.hospitalId ?? id;
  const base = {
    patientBloodGroup: 'O+' as BloodGroup,
    hospitalId: hospital('h-dhaka-1'),
    unitsNeeded: 1,
    contactPhone: '01700009999',
    note: '',
  };
  const seeds: Array<[string, Partial<StoredRequest>]> = [
    [
      'dn-seed-1',
      {
        status: 'accepted',
        neededBy: hoursFromNow(20),
        createdAt: hoursFromNow(-5),
        respondedAt: hoursFromNow(-4),
      },
    ],
    ['dn-seed-9', { status: 'sent', neededBy: hoursFromNow(30), createdAt: hoursFromNow(-2) }],
    [
      'dn-seed-17',
      {
        status: 'declined',
        neededBy: hoursFromNow(30),
        createdAt: hoursFromNow(-8),
        respondedAt: hoursFromNow(-7),
      },
    ],
    ['dn-seed-25', { status: 'sent', neededBy: hoursFromNow(-6), createdAt: hoursFromNow(-30) }],
    [
      'dn-seed-33',
      {
        status: 'fulfilled',
        neededBy: hoursFromNow(-200),
        createdAt: hoursFromNow(-240),
        respondedAt: hoursFromNow(-238),
        closedAt: hoursFromNow(-210),
      },
    ],
  ];
  for (const [donorId, seed] of seeds) {
    store.createRequest(
      me,
      demoUser.name,
      { ...base, donorId, neededBy: seed.neededBy ?? hoursFromNow(24) },
      seed,
    );
  }

  // Simulated breeding-site reports by the demo user.
  store.addReport(
    me,
    {
      photoUrl: null,
      location: [23.7465, 90.3762],
      areaName: 'Road 7, Dhanmondi',
      siteType: 'construction',
      note: '',
    },
    { status: 'under_review', createdAt: hoursFromNow(-30), updatedAt: hoursFromNow(-6) },
  );
  store.addReport(
    me,
    {
      photoUrl: null,
      location: [23.7806, 90.4193],
      areaName: 'Gulshan 1 lake road',
      siteType: 'drain',
      note: '',
    },
    { status: 'action_taken', createdAt: hoursFromNow(-240), updatedAt: hoursFromNow(-120) },
  );
  seedCommunityReports(store, hoursFromNow);
  return store;
}

/** Simulated reports from other citizens across the divisions (for the authority view). */
function seedCommunityReports(store: CommunityStore, hoursFromNow: (h: number) => string) {
  const sites: Array<
    [string, string, BreedingReportInput['siteType'], BreedingReportStatus, number]
  > = [
    ['mirpur', 'Mirpur 10 bus stand', 'standing_water', 'submitted', -3],
    ['gazipur', 'Tongi rail gate drain', 'drain', 'submitted', -9],
    ['narayanganj', 'Chashara market lane', 'tyres', 'under_review', -26],
    ['chattogram', 'Agrabad block C', 'construction', 'submitted', -14],
    ['coxs-bazar', 'Kolatoli road plot', 'standing_water', 'under_review', -50],
    ['cumilla', 'Kandirpar school yard', 'other', 'action_taken', -170],
    ['khulna', 'Sonadanga canal edge', 'drain', 'submitted', -6],
    ['barishal', 'Launch ghat warehouse', 'tyres', 'rejected', -200],
    ['sylhet', 'Zindabazar rooftop', 'standing_water', 'submitted', -20],
    ['rajshahi', 'Shaheb bazar lane 2', 'construction', 'under_review', -75],
    ['rangpur', 'Jahaj company more', 'other', 'submitted', -40],
    ['mymensingh', 'Ganginarpar drain', 'drain', 'action_taken', -300],
  ];
  const centers = new Map(
    divisions.flatMap((div) => div.districts.map((d) => [d.districtId, d.center] as const)),
  );
  sites.forEach(([districtId, areaName, siteType, status, hours], i) => {
    const center = centers.get(districtId === 'mirpur' ? 'dhaka' : districtId) ?? [23.8, 90.4];
    store.addReport(
      `u-citizen-${i + 1}`,
      {
        photoUrl: null,
        location: [center[0] + ((i % 3) - 1) * 0.01, center[1] + ((i % 2) - 0.5) * 0.02],
        areaName,
        siteType,
        note: '',
      },
      {
        status,
        createdAt: hoursFromNow(hours),
        updatedAt: hoursFromNow(Math.min(-1, Math.round(hours / 2))),
        statusNote: status === 'rejected' ? 'Not a breeding site (dry container).' : undefined,
      },
    );
  });
}

/** Simulated requests other people send once the demo user becomes a donor. */
export function seedInbox(
  store: CommunityStore,
  donorId: string,
  hospitals: Hospital[],
  start: Date,
) {
  const at = (hours: number) => new Date(start.getTime() + hours * 3_600_000).toISOString();
  const [first, second] = hospitals;
  if (!first || !second) return;
  store.createRequest(
    'u-requester-1',
    { en: 'Selina Begum', bn: 'সেলিনা বেগম' },
    {
      donorId,
      patientBloodGroup: 'B+',
      hospitalId: first.hospitalId,
      unitsNeeded: 1,
      neededBy: at(18),
      contactPhone: '01700008181',
      note: 'Platelets needed for my mother.',
    },
    { createdAt: at(-1) },
  );
  store.createRequest(
    'u-requester-2',
    { en: 'Hasan Ali', bn: 'হাসান আলী' },
    {
      donorId,
      patientBloodGroup: 'O+',
      hospitalId: second.hospitalId,
      unitsNeeded: 2,
      neededBy: at(40),
      contactPhone: '01700007272',
      note: '',
    },
    { createdAt: at(-3) },
  );
}
