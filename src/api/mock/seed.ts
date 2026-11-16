/**
 * SIMULATED seed data for development. None of these numbers are real statistics.
 * Values are generated deterministically so the UI looks the same on every load.
 */
import type {
  Appointment,
  BedAvailability,
  Division,
  DivisionId,
  Doctor,
  Hospital,
  LocalizedText,
  Notification,
  PreventionTip,
  User,
} from '../types';

export const divisions: Division[] = [
  { divisionId: 'dhaka', name: { en: 'Dhaka', bn: 'ঢাকা' } },
  { divisionId: 'chattogram', name: { en: 'Chattogram', bn: 'চট্টগ্রাম' } },
  { divisionId: 'khulna', name: { en: 'Khulna', bn: 'খুলনা' } },
  { divisionId: 'rajshahi', name: { en: 'Rajshahi', bn: 'রাজশাহী' } },
  { divisionId: 'barishal', name: { en: 'Barishal', bn: 'বরিশাল' } },
  { divisionId: 'sylhet', name: { en: 'Sylhet', bn: 'সিলেট' } },
  { divisionId: 'rangpur', name: { en: 'Rangpur', bn: 'রংপুর' } },
  { divisionId: 'mymensingh', name: { en: 'Mymensingh', bn: 'ময়মনসিংহ' } },
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

const districts: Record<DivisionId, LocalizedText[]> = {
  dhaka: [
    { en: 'Dhaka', bn: 'ঢাকা' },
    { en: 'Gazipur', bn: 'গাজীপুর' },
    { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ' },
  ],
  chattogram: [
    { en: 'Chattogram', bn: 'চট্টগ্রাম' },
    { en: "Cox's Bazar", bn: 'কক্সবাজার' },
    { en: 'Cumilla', bn: 'কুমিল্লা' },
  ],
  khulna: [
    { en: 'Khulna', bn: 'খুলনা' },
    { en: 'Jashore', bn: 'যশোর' },
    { en: 'Satkhira', bn: 'সাতক্ষীরা' },
  ],
  rajshahi: [
    { en: 'Rajshahi', bn: 'রাজশাহী' },
    { en: 'Bogura', bn: 'বগুড়া' },
    { en: 'Pabna', bn: 'পাবনা' },
  ],
  barishal: [
    { en: 'Barishal', bn: 'বরিশাল' },
    { en: 'Patuakhali', bn: 'পটুয়াখালী' },
    { en: 'Bhola', bn: 'ভোলা' },
  ],
  sylhet: [
    { en: 'Sylhet', bn: 'সিলেট' },
    { en: 'Moulvibazar', bn: 'মৌলভীবাজার' },
    { en: 'Habiganj', bn: 'হবিগঞ্জ' },
  ],
  rangpur: [
    { en: 'Rangpur', bn: 'রংপুর' },
    { en: 'Dinajpur', bn: 'দিনাজপুর' },
    { en: 'Kurigram', bn: 'কুড়িগ্রাম' },
  ],
  mymensingh: [
    { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
    { en: 'Jamalpur', bn: 'জামালপুর' },
    { en: 'Netrokona', bn: 'নেত্রকোণা' },
  ],
};

// Clearly fictional hospital name patterns (simulated).
const hospitalKinds: LocalizedText[] = [
  { en: 'Care Hospital', bn: 'কেয়ার হাসপাতাল' },
  { en: 'Community Hospital', bn: 'কমিউনিটি হাসপাতাল' },
  { en: 'Medical Centre', bn: 'মেডিকেল সেন্টার' },
];

/** Small deterministic PRNG so seeded numbers are stable between reloads. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export const hospitals: Hospital[] = divisions.flatMap((division) =>
  (districts[division.divisionId] ?? []).map((district, i) => {
    const kind = hospitalKinds[i % hospitalKinds.length] ?? { en: 'Hospital', bn: 'হাসপাতাল' };
    return {
      hospitalId: `h-${division.divisionId}-${i + 1}`,
      divisionId: division.divisionId,
      district,
      name: { en: `${district.en} ${kind.en}`, bn: `${district.bn} ${kind.bn}` },
    };
  }),
);

/** Bed availability; updatedAt is relative to "now" so freshness labels stay realistic. */
export function bedAvailability(now: Date): BedAvailability[] {
  const rand = seededRandom(42);
  return hospitals.map((hospital, i) => {
    const generalTotal = 60 + Math.floor(rand() * 140);
    const icuTotal = 6 + Math.floor(rand() * 18);
    const minutesAgo = 8 + ((i * 7) % 15);
    return {
      hospitalId: hospital.hospitalId,
      generalTotal,
      generalAvailable: Math.floor(generalTotal * (0.08 + rand() * 0.3)),
      icuTotal,
      icuAvailable: Math.floor(icuTotal * rand() * 0.5),
      updatedAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    };
  });
}

export const currentUser: User = {
  userId: 'u-demo-1',
  name: { en: 'Ayesha Rahman', bn: 'আয়েশা রহমান' },
  role: 'citizen',
  divisionId: 'dhaka',
};

const doctor: Doctor = {
  doctorId: 'd-1',
  name: { en: 'Dr. Farhana Akter', bn: 'ডা. ফারহানা আক্তার' },
  specialty: { en: 'Medicine', bn: 'মেডিসিন' },
};

export function nextAppointment(now: Date): Appointment {
  const start = new Date(now);
  start.setDate(start.getDate() + 2);
  start.setHours(10, 30, 0, 0);
  const hospital = hospitals[0];
  if (!hospital) throw new Error('Seed data has no hospitals');
  return {
    appointmentId: 'a-1',
    userId: currentUser.userId,
    status: 'booked',
    serialNo: 7,
    doctor,
    hospital,
    slot: {
      slotId: 's-1',
      doctorId: doctor.doctorId,
      hospitalId: hospital.hospitalId,
      start: start.toISOString(),
    },
  };
}

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
