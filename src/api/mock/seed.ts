/**
 * SIMULATED seed data for development. None of these numbers are real statistics,
 * hospitals and doctors are fictional, and phone numbers are deliberately invalid.
 * Values are generated deterministically so the UI looks the same on every load.
 */
import type {
  BedAvailability,
  District,
  Division,
  DivisionId,
  Doctor,
  Hospital,
  HospitalType,
  LocalizedText,
  Notification,
  PreventionTip,
  User,
  Weekday,
} from '../types';

const district = (districtId: string, en: string, bn: string, lat: number, lng: number) =>
  ({ districtId, name: { en, bn }, center: [lat, lng] }) satisfies District;

const districtsByDivision: Record<DivisionId, District[]> = {
  dhaka: [
    district('dhaka', 'Dhaka', 'ঢাকা', 23.81, 90.41),
    district('gazipur', 'Gazipur', 'গাজীপুর', 24.0, 90.42),
    district('narayanganj', 'Narayanganj', 'নারায়ণগঞ্জ', 23.62, 90.5),
  ],
  chattogram: [
    district('chattogram', 'Chattogram', 'চট্টগ্রাম', 22.36, 91.78),
    district('coxs-bazar', "Cox's Bazar", 'কক্সবাজার', 21.43, 92.01),
    district('cumilla', 'Cumilla', 'কুমিল্লা', 23.46, 91.18),
  ],
  khulna: [
    district('khulna', 'Khulna', 'খুলনা', 22.85, 89.54),
    district('jashore', 'Jashore', 'যশোর', 23.17, 89.21),
    district('satkhira', 'Satkhira', 'সাতক্ষীরা', 22.72, 89.07),
  ],
  rajshahi: [
    district('rajshahi', 'Rajshahi', 'রাজশাহী', 24.37, 88.6),
    district('bogura', 'Bogura', 'বগুড়া', 24.85, 89.37),
    district('pabna', 'Pabna', 'পাবনা', 24.0, 89.24),
  ],
  barishal: [
    district('barishal', 'Barishal', 'বরিশাল', 22.7, 90.35),
    district('patuakhali', 'Patuakhali', 'পটুয়াখালী', 22.36, 90.33),
    district('bhola', 'Bhola', 'ভোলা', 22.69, 90.65),
  ],
  sylhet: [
    district('sylhet', 'Sylhet', 'সিলেট', 24.89, 91.87),
    district('moulvibazar', 'Moulvibazar', 'মৌলভীবাজার', 24.48, 91.78),
    district('habiganj', 'Habiganj', 'হবিগঞ্জ', 24.37, 91.42),
  ],
  rangpur: [
    district('rangpur', 'Rangpur', 'রংপুর', 25.74, 89.28),
    district('dinajpur', 'Dinajpur', 'দিনাজপুর', 25.63, 88.64),
    district('kurigram', 'Kurigram', 'কুড়িগ্রাম', 25.81, 89.64),
  ],
  mymensingh: [
    district('mymensingh', 'Mymensingh', 'ময়মনসিংহ', 24.75, 90.42),
    district('jamalpur', 'Jamalpur', 'জামালপুর', 24.92, 89.95),
    district('netrokona', 'Netrokona', 'নেত্রকোণা', 24.88, 90.73),
  ],
};

const division = (divisionId: DivisionId, en: string, bn: string, center: [number, number]) =>
  ({
    divisionId,
    name: { en, bn },
    center,
    districts: districtsByDivision[divisionId],
  }) satisfies Division;

export const divisions: Division[] = [
  division('dhaka', 'Dhaka', 'ঢাকা', [23.81, 90.41]),
  division('chattogram', 'Chattogram', 'চট্টগ্রাম', [22.36, 91.78]),
  division('khulna', 'Khulna', 'খুলনা', [22.85, 89.54]),
  division('rajshahi', 'Rajshahi', 'রাজশাহী', [24.37, 88.6]),
  division('barishal', 'Barishal', 'বরিশাল', [22.7, 90.35]),
  division('sylhet', 'Sylhet', 'সিলেট', [24.89, 91.87]),
  division('rangpur', 'Rangpur', 'রংপুর', [25.74, 89.28]),
  division('mymensingh', 'Mymensingh', 'ময়মনসিংহ', [24.75, 90.42]),
];

/** Simulated base daily cases and 7-day slope per division (drives risk levels). */
export const forecastProfile: Record<DivisionId, { base: number; slope: number }> = {
  dhaka: { base: 210, slope: 9 },
  chattogram: { base: 128, slope: 6 },
  barishal: { base: 92, slope: 5 },
  khulna: { base: 108, slope: -4 },
  rajshahi: { base: 58, slope: -2 },
  mymensingh: { base: 44, slope: 4 },
  sylhet: { base: 33, slope: 2 },
  rangpur: { base: 18, slope: -1 },
};

/** Risk thresholds on predicted daily cases (configurable later, NFR30). */
export const riskThresholds = { medium: 40, high: 100 } as const;

/** Small deterministic PRNG so seeded numbers are stable between reloads. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Stable small hash for strings (seeding per slot / per id). */
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Clearly fictional hospital name patterns (simulated).
const hospitalKinds: Array<{ name: LocalizedText; type: HospitalType }> = [
  { name: { en: 'Care Hospital', bn: 'কেয়ার হাসপাতাল' }, type: 'private' },
  { name: { en: 'Community Hospital', bn: 'কমিউনিটি হাসপাতাল' }, type: 'government' },
  { name: { en: 'Medical Centre', bn: 'মেডিকেল সেন্টার' }, type: 'private' },
  { name: { en: 'General Hospital', bn: 'জেনারেল হাসপাতাল' }, type: 'government' },
  { name: { en: 'City Clinic', bn: 'সিটি ক্লিনিক' }, type: 'private' },
];

const DEFAULT_KIND = { name: { en: 'Hospital', bn: 'হাসপাতাল' }, type: 'government' as const };

/** Dhaka district gets extra hospitals (busiest area); every other district has one. */
const EXTRA_IN_DHAKA = 2;

function buildHospitals(): Hospital[] {
  const list: Hospital[] = [];
  for (const div of divisions) {
    div.districts.forEach((d, i) => {
      const count = div.divisionId === 'dhaka' && i === 0 ? 1 + EXTRA_IN_DHAKA : 1;
      for (let k = 0; k < count; k++) {
        const index = k === 0 ? i + 1 : div.districts.length + k;
        const kind = hospitalKinds[k === 0 ? i % 3 : 2 + k] ?? DEFAULT_KIND;
        const hospitalId = `h-${div.divisionId}-${index}`;
        const rand = seededRandom(hashString(hospitalId));
        const streetNo = 10 + Math.floor(rand() * 80);
        list.push({
          hospitalId,
          divisionId: div.divisionId,
          districtId: d.districtId,
          district: d.name,
          type: kind.type,
          name: { en: `${d.name.en} ${kind.name.en}`, bn: `${d.name.bn} ${kind.name.bn}` },
          address: {
            en: `${streetNo} Hospital Road, ${d.name.en}`,
            bn: `${toBanglaDigits(streetNo)} হাসপাতাল রোড, ${d.name.bn}`,
          },
          // Deliberately invalid (local numbers never start with 0 after the area code).
          phone: `+8802000000${String(list.length + 1).padStart(2, '0')}`,
          location: [d.center[0] + (rand() - 0.5) * 0.06, d.center[1] + (rand() - 0.5) * 0.06],
        });
      }
    });
  }
  return list;
}

function toBanglaDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)] ?? digit);
}

export const hospitals: Hospital[] = buildHospitals();

/** Districts where every hospital is full (to show the "nearby districts" fallback). */
export const FULL_DISTRICTS = new Set(['gazipur', 'netrokona']);
/** Hospitals whose bed data is stale (older than 6 hours). */
export const STALE_HOSPITALS = new Set(['h-rangpur-3']);

/** Bed availability; updatedAt is relative to "now" so freshness labels stay realistic. */
export function bedAvailability(now: Date): BedAvailability[] {
  const rand = seededRandom(42);
  return hospitals.map((hospital, i) => {
    const generalTotal = 60 + Math.floor(rand() * 140);
    const icuTotal = 6 + Math.floor(rand() * 18);
    const full = FULL_DISTRICTS.has(hospital.districtId);
    const minutesAgo = STALE_HOSPITALS.has(hospital.hospitalId) ? 8 * 60 : 8 + ((i * 7) % 15);
    const general = Math.floor(generalTotal * (0.08 + rand() * 0.3));
    const icu = Math.floor(icuTotal * rand() * 0.5);
    return {
      hospitalId: hospital.hospitalId,
      generalTotal,
      generalAvailable: full ? 0 : general,
      icuTotal,
      icuAvailable: full ? 0 : icu,
      updatedAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    };
  });
}

const doctorNames: LocalizedText[] = [
  { en: 'Dr. Farhana Akter', bn: 'ডা. ফারহানা আক্তার' },
  { en: 'Dr. Mahmudul Hasan', bn: 'ডা. মাহমুদুল হাসান' },
  { en: 'Dr. Nusrat Jahan', bn: 'ডা. নুসরাত জাহান' },
  { en: 'Dr. Tanvir Ahmed', bn: 'ডা. তানভীর আহমেদ' },
  { en: 'Dr. Shirin Sultana', bn: 'ডা. শিরিন সুলতানা' },
  { en: 'Dr. Rafiqul Islam', bn: 'ডা. রফিকুল ইসলাম' },
  { en: 'Dr. Sabina Yasmin', bn: 'ডা. সাবিনা ইয়াসমিন' },
  { en: 'Dr. Kamrul Hossain', bn: 'ডা. কামরুল হোসেন' },
  { en: 'Dr. Farzana Rahman', bn: 'ডা. ফারজানা রহমান' },
  { en: 'Dr. Arif Chowdhury', bn: 'ডা. আরিফ চৌধুরী' },
  { en: 'Dr. Taslima Begum', bn: 'ডা. তাসলিমা বেগম' },
  { en: 'Dr. Imran Kabir', bn: 'ডা. ইমরান কবির' },
];

const specialties: LocalizedText[] = [
  { en: 'Medicine', bn: 'মেডিসিন' },
  { en: 'Internal medicine', bn: 'ইন্টারনাল মেডিসিন' },
  { en: 'Medicine (fever clinic)', bn: 'মেডিসিন (জ্বর ক্লিনিক)' },
];

// Friday (5) is the weekly holiday.
const SAT_TO_THU: Weekday[] = [6, 0, 1, 2, 3, 4];
const ALTERNATE_DAYS: Weekday[][] = [
  [0, 2, 4],
  [6, 1, 3],
  [6, 0, 2, 4],
];

export const doctors: Doctor[] = hospitals.flatMap((hospital, h) => {
  const count = 2 + (h % 2);
  return Array.from({ length: count }, (_, i) => {
    const name = doctorNames[(h * 3 + i) % doctorNames.length] ?? { en: 'Doctor', bn: 'ডাক্তার' };
    return {
      doctorId: `d-${hospital.hospitalId}-${i + 1}`,
      hospitalId: hospital.hospitalId,
      name,
      specialty: specialties[(h + i) % specialties.length] ?? { en: 'Medicine', bn: 'মেডিসিন' },
      availableDays:
        i === 0 ? SAT_TO_THU : (ALTERNATE_DAYS[(h + i) % ALTERNATE_DAYS.length] ?? SAT_TO_THU),
    };
  });
});

export const currentUser: User = {
  userId: 'u-demo-1',
  name: { en: 'Ayesha Rahman', bn: 'আয়েশা রহমান' },
  role: 'citizen',
  divisionId: 'dhaka',
  alertDivisions: [],
};

export function notifications(now: Date): Notification[] {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  return [
    {
      notificationId: 'n-1',
      kind: 'risk_alert',
      title: { en: 'Dhaka risk is high', bn: 'ঢাকায় ঝুঁকি উচ্চ' },
      body: {
        en: 'The 7-day forecast for Dhaka moved to high risk. Remove standing water at home.',
        bn: 'ঢাকার ৭ দিনের পূর্বাভাস উচ্চ ঝুঁকিতে পৌঁছেছে। বাড়িতে জমে থাকা পানি সরিয়ে ফেলুন।',
      },
      createdAt: ago(35),
      read: false,
    },
    {
      notificationId: 'n-2',
      kind: 'appointment',
      title: { en: 'Appointment confirmed', bn: 'অ্যাপয়েন্টমেন্ট নিশ্চিত' },
      body: {
        en: 'Your serial number is 7 with Dr. Farhana Akter.',
        bn: 'ডা. ফারহানা আক্তারের সাথে আপনার সিরিয়াল নম্বর ৭।',
      },
      createdAt: ago(180),
      read: false,
    },
    {
      notificationId: 'n-3',
      kind: 'donor_request',
      title: { en: 'Platelet donors needed', bn: 'প্লাটিলেট দাতা প্রয়োজন' },
      body: {
        en: 'A hospital near you is looking for O+ platelet donors.',
        bn: 'আপনার কাছের একটি হাসপাতালে O+ প্লাটিলেট দাতা খোঁজা হচ্ছে।',
      },
      createdAt: ago(600),
      read: false,
    },
  ];
}

export const preventionTips: PreventionTip[] = [
  {
    tipId: 't-1',
    text: {
      en: 'Empty and scrub water containers, flower-pot trays and buckets at least once a week.',
      bn: 'সপ্তাহে অন্তত একবার পানির পাত্র, ফুলের টবের ট্রে ও বালতি খালি করে ঘষে পরিষ্কার করুন।',
    },
  },
  {
    tipId: 't-2',
    text: {
      en: 'Aedes mosquitoes bite in the daytime. Use a net or repellent when children nap.',
      bn: 'এডিস মশা দিনের বেলায় কামড়ায়। শিশুরা ঘুমালে মশারি বা মশা নিরোধক ব্যবহার করুন।',
    },
  },
  {
    tipId: 't-3',
    text: {
      en: 'Cover water tanks and drums tightly so mosquitoes cannot lay eggs.',
      bn: 'পানির ট্যাংক ও ড্রাম শক্ত করে ঢেকে রাখুন যাতে মশা ডিম পাড়তে না পারে।',
    },
  },
  {
    tipId: 't-4',
    text: {
      en: 'Check rooftops, AC trays and discarded tyres for standing water after rain.',
      bn: 'বৃষ্টির পরে ছাদ, এসির ট্রে ও ফেলে রাখা টায়ারে জমে থাকা পানি আছে কিনা দেখুন।',
    },
  },
  {
    tipId: 't-5',
    text: {
      en: 'Wear long sleeves and trousers in the early morning and late afternoon.',
      bn: 'ভোরে ও বিকেলে লম্বা হাতার জামা ও ফুলপ্যান্ট পরুন।',
    },
  },
];
