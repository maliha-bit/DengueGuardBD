import { describe, expect, it } from 'vitest';
import { toIsoDate } from '@/lib/format';
import { mockApi, mockStaffStore } from './handlers';
import { staffMockApi as staff } from './staffHandlers';
import { isStaffError, STAFF_HOSPITAL_ID, STAFF_LAB_ID } from './staffStore';

const actions = () =>
  mockStaffStore()
    .listAudit()
    .map((e) => e.action);

describe('audit log entries', () => {
  it('starts empty and logs a bed update with who, role and target', async () => {
    expect(actions()).toEqual([]);
    await mockApi.setDemoRole('hospital_staff');
    const { beds } = (await staff.getStaffHospital())!;
    await staff.updateBeds({ generalAvailable: 0, icuAvailable: beds.icuAvailable });
    const [entry] = mockStaffStore().listAudit();
    expect(entry).toMatchObject({
      action: 'beds_update',
      actorRole: 'hospital_staff',
      actorName: { en: 'Nasima Khatun' },
      target: { en: 'Dhaka Care Hospital' },
    });
    expect(new Date(entry!.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('logs hospital, lab, authority and admin actions, newest first', async () => {
    await mockApi.setDemoRole('hospital_staff');
    const [doctor] = await staff.getStaffDoctors();
    await staff.saveDoctor(null, { name: 'Dr. Test', specialty: 'Medicine', phone: '01700000000' });
    await staff.setDoctorActive(doctor!.doctorId, false);
    const [appointment] = (await staff.getHospitalAppointments()).filter(
      (a) => a.status === 'booked',
    );
    await staff.setAppointmentStatus(appointment!.appointmentId, 'completed');

    await mockApi.setDemoRole('lab_staff');
    const lab = (await staff.getStaffLab())!;
    await staff.publishLab({
      name: lab.name.en,
      nameBn: lab.name.bn,
      address: lab.address.en,
      phone: lab.phone,
      homeCollection: true,
      weeklyHours: lab.weeklyHours!,
      tests: [{ code: 'ns1', priceBdt: 450, priceMaxBdt: 600 }],
    });

    await mockApi.setDemoRole('authority');
    const report = (await staff.getAuthorityReports()).find((r) => r.status === 'submitted')!;
    await staff.setReportStatus(report.reportId, 'under_review', '');
    const task = await staff.createTask({
      title: 'Clear drains',
      area: 'Mirpur',
      divisionId: 'dhaka',
      assignedTeam: 'Team A',
      dueDate: toIsoDate(new Date()),
      linkedReportId: report.reportId,
    });
    await staff.moveTask(task.taskId, 'in_progress');
    await staff.logExport('prevention-tasks.csv');

    await mockApi.setDemoRole('admin');
    await staff.decideSignup('su-2', false, 'Document unreadable');
    await staff.setDirectoryActive('hospital', 'h-sylhet-1', false);
    await staff.saveKnowledgeSource(null, {
      title: 'Test source',
      publisher: 'WHO',
      url: 'https://www.who.int',
      reviewedOn: toIsoDate(new Date()),
    });
    await staff.startForecastRun();

    expect(actions()).toEqual([
      'forecast_run',
      'source_create',
      'hospital_deactivate',
      'signup_reject',
      'export_csv',
      'task_move',
      'task_create',
      'report_status',
      'lab_publish',
      'appointment_completed',
      'doctor_deactivate',
      'doctor_create',
    ]);
    // The admin sees the same trail through the API.
    expect((await staff.getAuditTrail()).map((e) => e.action)).toEqual(actions());
  });

  it('does not log reads or rejected changes', async () => {
    await mockApi.setDemoRole('hospital_staff');
    await staff.getStaffHospital();
    await staff.getStaffDoctors();
    const error = await staff
      .updateBeds({ generalAvailable: 9999, icuAvailable: 0 })
      .catch((e: unknown) => e);
    expect(isStaffError(error) && error.code).toBe('INVALID_BEDS');
    expect(actions()).toEqual([]);
  });
});

describe('staff changes reach citizen pages', () => {
  it('a bed update shows in the citizen hospital data', async () => {
    await mockApi.setDemoRole('hospital_staff');
    await staff.updateBeds({ generalAvailable: 7, icuAvailable: 2 });
    await mockApi.setDemoRole('citizen');
    const hospital = await mockApi.getHospital(STAFF_HOSPITAL_ID);
    expect(hospital?.beds).toMatchObject({ generalAvailable: 7, icuAvailable: 2 });
  });

  it('a published lab listing shows in the citizen lab search', async () => {
    await mockApi.setDemoRole('lab_staff');
    const lab = (await staff.getStaffLab())!;
    await staff.publishLab({
      name: 'Renamed Lab',
      nameBn: 'নতুন ল্যাব',
      address: lab.address.en,
      phone: lab.phone,
      homeCollection: false,
      weeklyHours: Array.from({ length: 7 }, () => ({ kind: 'allDay' as const })),
      tests: [{ code: 'cbc', priceBdt: 300, priceMaxBdt: 350 }],
    });
    const listed = (await mockApi.getLabs()).find((l) => l.labId === STAFF_LAB_ID)!;
    expect(listed.name.en).toBe('Renamed Lab');
    expect(listed.openingHours).toBeNull();
    expect(listed.tests.map((t) => [t.code, t.priceBdt, t.priceMaxBdt])).toEqual([
      ['cbc', 300, 350],
    ]);
  });

  it('a report status change shows in the citizen My reports timeline', async () => {
    const mine = await mockApi.getMyBreedingReports();
    const target = mine.find((r) => r.status === 'under_review')!;
    await mockApi.setDemoRole('authority');
    await staff.setReportStatus(target.reportId, 'action_taken', 'Cleared by the city team.');
    await mockApi.setDemoRole('citizen');
    const after = (await mockApi.getMyBreedingReports()).find(
      (r) => r.reportId === target.reportId,
    )!;
    expect(after.status).toBe('action_taken');
    expect(after.statusNote).toBe('Cleared by the city team.');
  });

  it('blocks publishing slots that overlap published ones', async () => {
    await mockApi.setDemoRole('hospital_staff');
    const [published] = await staff.getPublishedSlots();
    const day = toIsoDate(new Date(published!.start));
    const input = {
      doctorId: published!.doctorId,
      from: day,
      to: day,
      slotMinutes: 30,
      capacity: 5,
    };
    const preview = await staff.previewSlots(input);
    expect(preview.overlaps.length).toBeGreaterThan(0);
    const error = await staff.publishSlots(input).catch((e: unknown) => e);
    expect(isStaffError(error) && error.code).toBe('SLOT_OVERLAP');
  });

  it('refuses staff calls from the wrong role or an unapproved account', async () => {
    await mockApi.setDemoRole('citizen');
    expect(await staff.getStaffHospital().catch((e: unknown) => isStaffError(e) && e.code)).toBe(
      'FORBIDDEN',
    );
    await mockApi.setDemoRole('hospital_staff_new');
    expect(await staff.getStaffHospital().catch((e: unknown) => isStaffError(e) && e.code)).toBe(
      'FORBIDDEN',
    );
  });
});
