/**
 * Mock chatbot knowledge base (UC19), written from DGHS national dengue guidelines and the
 * WHO dengue fact sheet. Plain health information only: no diagnosis, no doses beyond what
 * is printed on the medicine pack. The real backend will replace this.
 *
 * Matching: every keyword found in the (lower-cased) question adds 1 point; the entry with
 * the most points wins (ties: the earlier entry). English keywords must start at a word
 * boundary ("eat" matches "eating" but not "great").
 */
import type { ChatSource, LocalizedText } from '../types';

export interface KnowledgeEntry {
  id: string;
  keywords: { en: string[]; bn: string[] };
  answer: LocalizedText;
  sources: ChatSource[];
}

export const CHAT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'symptoms',
    keywords: {
      en: ['symptom', 'signs of dengue', 'how do i know', 'do i have dengue', 'feel like'],
      bn: ['লক্ষণ', 'উপসর্গ', 'কীভাবে বুঝব', 'বুঝবো'],
    },
    answer: {
      en: 'Common dengue symptoms are a sudden high fever, severe headache, pain behind the eyes, body, joint and muscle aches, nausea or vomiting and sometimes a skin rash. They usually start 4 to 10 days after a mosquito bite. If you have a fever during dengue season, get checked early.',
      bn: 'ডেঙ্গুর সাধারণ লক্ষণ হলো হঠাৎ তীব্র জ্বর, প্রচণ্ড মাথাব্যথা, চোখের পেছনে ব্যথা, শরীর, গিঁট ও মাংসপেশিতে ব্যথা, বমি বমি ভাব বা বমি এবং কখনো ত্বকে র‍্যাশ। মশা কামড়ানোর সাধারণত ৪ থেকে ১০ দিন পর লক্ষণ শুরু হয়। ডেঙ্গুর মৌসুমে জ্বর হলে দ্রুত পরীক্ষা করান।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'warningSigns',
    keywords: {
      en: [
        'warning sign',
        'danger sign',
        'severe dengue',
        'when to go to hospital',
        'when should i go',
      ],
      bn: ['সতর্কতা লক্ষণ', 'বিপদ', 'মারাত্মক ডেঙ্গু', 'কখন হাসপাতালে'],
    },
    answer: {
      en: 'Warning signs of severe dengue are: severe belly pain, vomiting again and again, bleeding from gums or nose, blood in vomit or stool, drowsiness or restlessness, cold clammy skin, fast breathing and very little urine. They often appear when the fever goes down (day 3 to 7). Any one of them means: go to a hospital emergency now.',
      bn: 'মারাত্মক ডেঙ্গুর সতর্কতা লক্ষণ: পেটে তীব্র ব্যথা, বারবার বমি, মাড়ি বা নাক দিয়ে রক্ত পড়া, বমি বা পায়খানায় রক্ত, ঝিমুনি বা অস্থিরতা, ঠান্ডা ভেজা ত্বক, দ্রুত শ্বাস এবং খুব কম প্রস্রাব। এগুলো প্রায়ই জ্বর কমার সময় (৩য় থেকে ৭ম দিন) দেখা দেয়। যেকোনো একটি থাকলে এখনই হাসপাতালের জরুরি বিভাগে যান।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'criticalPhase',
    keywords: {
      en: ['critical phase', 'fever went down', 'fever is gone', 'day 3', 'day 5', 'safe now'],
      bn: ['জ্বর কমে গেছে', 'জ্বর চলে গেছে', 'ঝুঁকিপূর্ণ সময়', 'ক্রিটিক্যাল'],
    },
    answer: {
      en: 'The riskiest time is often when the fever drops, around day 3 to 7. This is called the critical phase. Do not relax just because the fever is gone: keep drinking fluids and watch closely for warning signs for the next 48 hours.',
      bn: 'সবচেয়ে ঝুঁকিপূর্ণ সময় প্রায়ই জ্বর কমার সময়, ৩য় থেকে ৭ম দিনের দিকে। একে ক্রিটিক্যাল পর্যায় বলে। জ্বর চলে গেছে বলে নিশ্চিন্ত হবেন না: পরের ৪৮ ঘণ্টা তরল খেতে থাকুন এবং সতর্কতা লক্ষণের দিকে কড়া নজর রাখুন।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'fluidAmount',
    keywords: {
      en: [
        'how much water',
        'how much fluid',
        'how many glass',
        'litre',
        'liter',
        'how much should i drink',
      ],
      bn: ['কতটুকু পানি', 'কত গ্লাস', 'কত লিটার', 'কতটা পানি', 'কী পরিমাণ'],
    },
    answer: {
      en: 'Drink often through the day, even when you are not thirsty. Adults usually need about 2.5 to 3 litres (10 to 12 glasses) of fluids a day while they have dengue, unless a doctor says otherwise. Children need less, by weight: ask a doctor. Passing light-coloured urine every 4 to 6 hours is a good sign.',
      bn: 'পিপাসা না লাগলেও সারাদিন বারবার তরল খান। ডেঙ্গুর সময় প্রাপ্তবয়স্কদের সাধারণত দিনে প্রায় ২.৫ থেকে ৩ লিটার (১০ থেকে ১২ গ্লাস) তরল দরকার, যদি না ডাক্তার অন্য কিছু বলেন। শিশুদের লাগে ওজন অনুযায়ী কম: ডাক্তারের পরামর্শ নিন। প্রতি ৪ থেকে ৬ ঘণ্টায় হালকা রঙের প্রস্রাব হওয়া ভালো লক্ষণ।',
    },
    sources: ['dghs'],
  },
  {
    id: 'fluids',
    keywords: {
      en: ['what to drink', 'what should i drink', 'hydrat', 'coconut', 'juice', 'soup', 'drink'],
      bn: ['কী খাব', 'কী পান', 'ডাবের পানি', 'শরবত', 'স্যুপ', 'তরল'],
    },
    answer: {
      en: 'Good fluids are ORS (oral saline), clean water, coconut water, soup, dal water, rice water and fresh fruit juice. Sip small amounts often. Avoid fizzy drinks and very sugary drinks, and avoid red or brown drinks that could be confused with blood in vomit.',
      bn: 'ভালো তরল হলো খাবার স্যালাইন, বিশুদ্ধ পানি, ডাবের পানি, স্যুপ, ডালের পানি, ভাতের মাড় ও তাজা ফলের রস। অল্প অল্প করে বারবার খান। কোমল পানীয় ও খুব মিষ্টি পানীয় এড়িয়ে চলুন, আর লাল বা বাদামি রঙের পানীয় খাবেন না, যাতে বমির রক্তের সাথে গুলিয়ে না যায়।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'ors',
    keywords: {
      en: ['ors', 'saline', 'oral rehydration', 'make ors'],
      bn: ['স্যালাইন', 'ওরস্যালাইন', 'খাবার স্যালাইন'],
    },
    answer: {
      en: 'Make ORS exactly as the packet says: usually one packet in half a litre (500 ml) of clean drinking water. Do not add sugar or salt. Use it within 12 hours and make a fresh batch after that.',
      bn: 'প্যাকেটের নিয়ম মেনে খাবার স্যালাইন বানান: সাধারণত এক প্যাকেট আধা লিটার (৫০০ মি.লি.) বিশুদ্ধ পানিতে। আলাদা চিনি বা লবণ মেশাবেন না। ১২ ঘণ্টার মধ্যে খেয়ে ফেলুন, এরপর নতুন করে বানান।',
    },
    sources: ['dghs'],
  },
  {
    id: 'paracetamol',
    keywords: {
      en: ['paracetamol', 'napa', 'fever medicine', 'reduce fever', 'bring down fever'],
      bn: ['প্যারাসিটামল', 'নাপা', 'জ্বরের ওষুধ', 'জ্বর কমা'],
    },
    answer: {
      en: 'For fever and pain, paracetamol is the only safe medicine in dengue. Never take more than the pack says: adults no more than 4 g (8 tablets of 500 mg) in a day; children by weight as a doctor advises. Sponging with normal-temperature water also helps.',
      bn: 'ডেঙ্গুতে জ্বর ও ব্যথার জন্য প্যারাসিটামলই একমাত্র নিরাপদ ওষুধ। প্যাকেটে লেখা মাত্রার বেশি কখনো খাবেন না: প্রাপ্তবয়স্ক দিনে ৪ গ্রামের (৫০০ মি.গ্রা.-এর ৮টি ট্যাবলেট) বেশি নয়; শিশুদের ওজন অনুযায়ী, ডাক্তারের পরামর্শে। স্বাভাবিক তাপমাত্রার পানি দিয়ে শরীর মুছে দিলেও উপকার হয়।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'nsaids',
    keywords: {
      en: ['avoid', 'ibuprofen', 'aspirin', 'nsaid', 'painkiller', 'diclofenac', 'should not take'],
      bn: ['এড়িয়ে', 'খাওয়া যাবে না', 'আইবুপ্রোফেন', 'অ্যাসপিরিন', 'ব্যথানাশক', 'ডাইক্লোফেনাক'],
    },
    answer: {
      en: 'Do not take ibuprofen, aspirin, diclofenac, naproxen or other NSAID painkillers in dengue: they can cause dangerous bleeding. Also avoid injections, steroids and antibiotics unless a doctor prescribes them. Use paracetamol only.',
      bn: 'ডেঙ্গুতে আইবুপ্রোফেন, অ্যাসপিরিন, ডাইক্লোফেনাক, ন্যাপ্রোক্সেন বা অন্য NSAID ব্যথানাশক খাবেন না: এগুলো বিপজ্জনক রক্তক্ষরণ ঘটাতে পারে। ডাক্তারের পরামর্শ ছাড়া ইনজেকশন, স্টেরয়েড ও অ্যান্টিবায়োটিকও নয়। শুধু প্যারাসিটামল খান।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'antibiotics',
    keywords: {
      en: ['antibiotic', 'cure', 'treatment', 'medicine for dengue', 'vaccine'],
      bn: ['অ্যান্টিবায়োটিক', 'চিকিৎসা', 'সারানোর ওষুধ', 'টিকা', 'ভ্যাকসিন'],
    },
    answer: {
      en: 'There is no specific medicine that cures dengue, and antibiotics do not work against the dengue virus. Treatment is rest, plenty of fluids, paracetamol for fever and close watching for warning signs. Severe dengue is treated in hospital with careful fluid management.',
      bn: 'ডেঙ্গু সারানোর কোনো নির্দিষ্ট ওষুধ নেই, আর অ্যান্টিবায়োটিক ডেঙ্গু ভাইরাসের বিরুদ্ধে কাজ করে না। চিকিৎসা হলো বিশ্রাম, প্রচুর তরল, জ্বরের জন্য প্যারাসিটামল এবং সতর্কতা লক্ষণের দিকে নজর রাখা। মারাত্মক ডেঙ্গুর চিকিৎসা হাসপাতালে সতর্কভাবে তরল দিয়ে করা হয়।',
    },
    sources: ['who'],
  },
  {
    id: 'ns1',
    keywords: {
      en: ['ns1', 'first days', 'early test', 'which test', 'when to test', 'when should i test'],
      bn: ['এনএস১', 'এনএস ১', 'কোন পরীক্ষা', 'কখন পরীক্ষা', 'প্রথম দিকে'],
    },
    answer: {
      en: 'The NS1 antigen test works best in the first 1 to 5 days of fever. After about day 5, NS1 can be negative even if you have dengue, so doctors use an antibody (IgM/IgG) test instead. A CBC test checks platelets and blood thickness (haematocrit).',
      bn: 'NS1 অ্যান্টিজেন পরীক্ষা জ্বরের প্রথম ১ থেকে ৫ দিনে সবচেয়ে ভালো কাজ করে। ৫ম দিনের পর ডেঙ্গু থাকলেও NS1 নেগেটিভ আসতে পারে, তাই তখন ডাক্তার অ্যান্টিবডি (IgM/IgG) পরীক্ষা দেন। CBC পরীক্ষায় প্লাটিলেট ও রক্তের ঘনত্ব (হেমাটোক্রিট) দেখা হয়।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'antibody',
    keywords: {
      en: ['igm', 'igg', 'antibody', 'after day 5', 'late test'],
      bn: ['আইজিএম', 'আইজিজি', 'অ্যান্টিবডি', '৫ দিন পর'],
    },
    answer: {
      en: 'IgM antibodies usually show up from about day 5 of illness, so the IgM/IgG test is used later in the illness. A positive IgG can also mean a past dengue infection. Your doctor will read the result together with your symptoms and CBC.',
      bn: 'IgM অ্যান্টিবডি সাধারণত অসুস্থতার ৫ম দিন থেকে পাওয়া যায়, তাই IgM/IgG পরীক্ষা অসুস্থতার পরের দিকে করা হয়। IgG পজিটিভ মানে আগে ডেঙ্গু হয়েছিল, এমনও হতে পারে। ডাক্তার আপনার লক্ষণ ও CBC-এর সাথে মিলিয়ে ফলাফল বুঝবেন।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'platelets',
    keywords: {
      en: ['platelet', 'cbc', 'blood count', 'haematocrit', 'hematocrit'],
      bn: ['প্লাটিলেট', 'প্লেটলেট', 'সিবিসি', 'রক্তের কণিকা'],
    },
    answer: {
      en: 'Platelets often fall in dengue, especially around day 3 to 7, and usually recover on their own. A low count alone does not always need a transfusion; doctors decide based on bleeding and your overall condition. Repeat CBC tests as your doctor advises.',
      bn: 'ডেঙ্গুতে প্লাটিলেট প্রায়ই কমে যায়, বিশেষ করে ৩য় থেকে ৭ম দিনে, আর সাধারণত নিজে থেকেই আবার বাড়ে। শুধু প্লাটিলেট কম হলেই সবসময় রক্ত দিতে হয় না; রক্তক্ষরণ ও সার্বিক অবস্থা দেখে ডাক্তার সিদ্ধান্ত নেন। ডাক্তারের পরামর্শমতো CBC আবার করান।',
    },
    sources: ['dghs'],
  },
  {
    id: 'papaya',
    keywords: {
      en: ['papaya', 'papaya leaf', 'kiwi', 'goat milk', 'home remedy', 'herbal'],
      bn: ['পেঁপে', 'পেঁপে পাতা', 'কিউই', 'ছাগলের দুধ', 'ঘরোয়া', 'ভেষজ'],
    },
    answer: {
      en: 'Papaya leaf juice, kiwi or goat milk are not proven treatments for dengue and should not replace medical care. Eat normal, easy-to-digest food, keep drinking fluids and follow your doctor.',
      bn: 'পেঁপে পাতার রস, কিউই বা ছাগলের দুধ ডেঙ্গুর প্রমাণিত চিকিৎসা নয়, এবং এগুলো চিকিৎসার বিকল্প নয়। স্বাভাবিক, সহজপাচ্য খাবার খান, তরল খেতে থাকুন এবং ডাক্তারের পরামর্শ মানুন।',
    },
    sources: ['dghs'],
  },
  {
    id: 'food',
    keywords: {
      en: ['food', 'eat', 'diet', 'meal'],
      bn: ['খাবার', 'খাওয়া', 'পথ্য'],
    },
    answer: {
      en: 'Eat normal home food that is soft and easy to digest, such as rice, dal, vegetables, eggs, fish and fruit. Small, frequent meals help when appetite is low. Fluids matter most, so drink between meals too.',
      bn: 'নরম ও সহজপাচ্য ঘরের স্বাভাবিক খাবার খান, যেমন ভাত, ডাল, সবজি, ডিম, মাছ ও ফল। রুচি কম থাকলে অল্প করে বারবার খান। তরলই সবচেয়ে জরুরি, তাই খাবারের মাঝেও পান করুন।',
    },
    sources: ['dghs'],
  },
  {
    id: 'prevention',
    keywords: {
      en: ['prevent', 'protect', 'avoid mosquito', 'stop dengue', 'net', 'repellent'],
      bn: ['প্রতিরোধ', 'বাঁচ', 'মশারি', 'মশা তাড়া', 'রেপেলেন্ট'],
    },
    answer: {
      en: 'Remove standing water around your home every week, cover water containers, sleep under a mosquito net (also in the daytime), use repellent, and wear long sleeves and trousers. Aedes mosquitoes breed in clean, still water.',
      bn: 'প্রতি সপ্তাহে বাড়ির চারপাশের জমে থাকা পানি সরান, পানির পাত্র ঢেকে রাখুন, মশারি টানিয়ে ঘুমান (দিনের বেলাতেও), মশা তাড়ানোর ক্রিম ব্যবহার করুন এবং লম্বা হাতার জামা ও প্যান্ট পরুন। এডিস মশা পরিষ্কার, স্থির পানিতে বংশ বাড়ায়।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'breeding',
    keywords: {
      en: ['breed', 'standing water', 'larva', 'flower pot', 'tyre', 'tire', 'aedes'],
      bn: ['প্রজনন', 'জমে থাকা পানি', 'লার্ভা', 'ফুলের টব', 'টায়ার', 'এডিস'],
    },
    answer: {
      en: 'Aedes mosquitoes lay eggs in small amounts of clean, still water: flower-pot trays, buckets, old tyres, coconut shells, AC and fridge trays, roof gutters and construction sites. Empty and scrub these at least once a week. You can report a breeding site in this app.',
      bn: 'এডিস মশা অল্প পরিষ্কার, স্থির পানিতে ডিম পাড়ে: ফুলের টবের ট্রে, বালতি, পুরোনো টায়ার, ডাবের খোসা, এসি ও ফ্রিজের ট্রে, ছাদের নালা এবং নির্মাণস্থল। সপ্তাহে অন্তত একবার এগুলো খালি করে ঘষে পরিষ্কার করুন। এই অ্যাপে প্রজননস্থলের খবর জানাতে পারেন।',
    },
    sources: ['dghs', 'who'],
  },
  {
    id: 'biteTime',
    keywords: {
      en: ['what time', 'when do mosquitoes bite', 'daytime', 'morning', 'evening'],
      bn: ['কখন কামড়', 'দিনের বেলা', 'সকালে', 'বিকেলে'],
    },
    answer: {
      en: 'Aedes mosquitoes mostly bite in the daytime, especially in the early morning and late afternoon. Use a net or repellent for babies and anyone sleeping during the day.',
      bn: 'এডিস মশা বেশিরভাগ দিনের বেলায় কামড়ায়, বিশেষ করে ভোরে ও বিকেলের শেষে। দিনে যারা ঘুমায়, বিশেষ করে শিশুদের জন্য মশারি বা মশা তাড়ানোর ক্রিম ব্যবহার করুন।',
    },
    sources: ['who'],
  },
  {
    id: 'contagious',
    keywords: {
      en: ['contagious', 'spread', 'catch it from', 'infect others', 'person to person'],
      bn: ['ছোঁয়াচে', 'ছড়ায়', 'অন্যদের হবে'],
    },
    answer: {
      en: 'Dengue does not spread directly from person to person. It spreads through the bite of an infected Aedes mosquito. A sick person should still sleep under a net so mosquitoes do not bite them and carry the virus to others.',
      bn: 'ডেঙ্গু সরাসরি একজন থেকে আরেকজনে ছড়ায় না। এটি আক্রান্ত এডিস মশার কামড়ে ছড়ায়। তবু অসুস্থ ব্যক্তির মশারির নিচে থাকা উচিত, যাতে মশা তাকে কামড়ে অন্যদের মধ্যে ভাইরাস না ছড়ায়।',
    },
    sources: ['who'],
  },
  {
    id: 'secondInfection',
    keywords: {
      en: ['second time', 'again', 'twice', 'second infection', 'had dengue before'],
      bn: ['আবার ডেঙ্গু', 'দ্বিতীয়বার', 'দুইবার', 'আগে ডেঙ্গু'],
    },
    answer: {
      en: 'Yes, you can get dengue more than once, because there are four types of dengue virus. A second infection with a different type has a higher risk of severe dengue, so watch closely for warning signs.',
      bn: 'হ্যাঁ, ডেঙ্গু একাধিকবার হতে পারে, কারণ ডেঙ্গু ভাইরাসের চারটি ধরন আছে। ভিন্ন ধরনের দ্বিতীয় সংক্রমণে মারাত্মক ডেঙ্গুর ঝুঁকি বেশি, তাই সতর্কতা লক্ষণের দিকে কড়া নজর রাখুন।',
    },
    sources: ['who'],
  },
  {
    id: 'recovery',
    keywords: {
      en: ['recover', 'how long', 'get better', 'weak after', 'tired after'],
      bn: ['সেরে', 'কত দিন', 'সুস্থ হতে', 'দুর্বল'],
    },
    answer: {
      en: 'Most people recover in about a week. Signs of recovery are: no fever for 2 days without paracetamol, appetite coming back, normal urine and feeling stronger. Tiredness can last a few weeks; rest and eat well.',
      bn: 'বেশিরভাগ মানুষ প্রায় এক সপ্তাহে সেরে ওঠেন। সেরে ওঠার লক্ষণ: প্যারাসিটামল ছাড়া ২ দিন জ্বর নেই, রুচি ফিরছে, প্রস্রাব স্বাভাবিক এবং শক্তি বাড়ছে। ক্লান্তি কয়েক সপ্তাহ থাকতে পারে; বিশ্রাম নিন ও ভালো করে খান।',
    },
    sources: ['dghs', 'who'],
  },
];
