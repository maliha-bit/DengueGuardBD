import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Power, Stethoscope } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSaveDoctor, useSetDoctorActive, useStaffDoctors } from '@/api/staffQueries';
import type { StaffDoctor } from '@/api/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useFieldError } from '@/components/useFieldError';
import { useStaffError } from '@/components/useStaffError';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Modal,
  SkeletonCard,
  useToast,
} from '@/components/ui';
import { localDigits } from '@/lib/format';
import { nameField, phoneField } from '@/lib/staffSchemas';
import { useLocale } from '@/lib/useLocale';

const doctorSchema = z.object({ name: nameField, specialty: nameField, phone: phoneField });
type DoctorForm = z.input<typeof doctorSchema>;

/** Doctors of the hospital: list, add, edit and deactivate. */
export default function DoctorsPage() {
  const { t, l, lang } = useLocale();
  const query = useStaffDoctors();
  const toast = useToast();
  const showError = useStaffError();
  const setActive = useSetDoctorActive();
  const [editing, setEditing] = useState<StaffDoctor | 'new' | null>(null);
  const [deactivating, setDeactivating] = useState<StaffDoctor | null>(null);

  const toggle = (doctor: StaffDoctor, active: boolean) =>
    setActive.mutate(
      { doctorId: doctor.doctorId, active },
      {
        onSuccess: () => {
          toast({
            tone: 'success',
            message: t(active ? 'staff.doctors.activated' : 'staff.doctors.deactivated', {
              name: l(doctor.name),
            }),
          });
          setDeactivating(null);
        },
        onError: showError,
      },
    );

  return (
    <>
      <PageHeader
        title={t('staff.doctors.title')}
        subtitle={t('staff.doctors.subtitle')}
        actions={
          <Button leadingIcon={Plus} size="sm" onClick={() => setEditing('new')}>
            {t('staff.doctors.add')}
          </Button>
        }
      />
      <Card title={t('staff.doctors.listTitle')} icon={Stethoscope} titleAs="h2">
        <QueryState
          query={query}
          skeleton={<SkeletonCard />}
          isEmpty={(list) => list.length === 0}
          empty={<EmptyState icon={Stethoscope} title={t('staff.doctors.emptyTitle')} />}
        >
          {(doctors) => (
            <DataTable
              caption={t('staff.doctors.listTitle')}
              rows={doctors}
              rowKey={(d) => d.doctorId}
              columns={[
                {
                  key: 'name',
                  header: t('staff.doctors.name'),
                  primary: true,
                  cell: (d) => l(d.name),
                },
                {
                  key: 'specialty',
                  header: t('staff.doctors.specialty'),
                  cell: (d) => l(d.specialty),
                },
                {
                  key: 'phone',
                  header: t('staff.doctors.phone'),
                  cell: (d) => localDigits(d.phone, lang),
                },
                {
                  key: 'status',
                  header: t('staff.common.status'),
                  cell: (d) => (
                    <Badge tone={d.active ? 'lime' : 'neutral'}>
                      {t(d.active ? 'staff.common.active' : 'staff.common.inactive')}
                    </Badge>
                  ),
                },
              ]}
              actions={(d) => (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    leadingIcon={Pencil}
                    onClick={() => setEditing(d)}
                    aria-label={t('staff.common.editNamed', { name: l(d.name) })}
                  >
                    {t('staff.common.edit')}
                  </Button>
                  {d.active ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      leadingIcon={Power}
                      onClick={() => setDeactivating(d)}
                    >
                      {t('staff.common.deactivate')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      leadingIcon={Power}
                      loading={setActive.isPending && setActive.variables?.doctorId === d.doctorId}
                      onClick={() => toggle(d, true)}
                    >
                      {t('staff.common.activate')}
                    </Button>
                  )}
                </>
              )}
            />
          )}
        </QueryState>
      </Card>

      {editing && (
        <DoctorFormModal
          doctor={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={deactivating !== null}
        title={t('staff.doctors.deactivateTitle')}
        message={t('staff.doctors.deactivateBody', {
          name: deactivating ? l(deactivating.name) : '',
        })}
        confirmLabel={t('staff.common.deactivate')}
        loading={setActive.isPending}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && toggle(deactivating, false)}
      />
    </>
  );
}

function DoctorFormModal({ doctor, onClose }: { doctor: StaffDoctor | null; onClose: () => void }) {
  const { t } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const fieldError = useFieldError();
  const save = useSaveDoctor();
  const { register, handleSubmit, formState } = useForm<
    DoctorForm,
    unknown,
    z.output<typeof doctorSchema>
  >({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: doctor?.name.en ?? '',
      specialty: doctor?.specialty.en ?? '',
      phone: doctor?.phone ?? '',
    },
  });
  const onSubmit = handleSubmit((input) =>
    save.mutate(
      { doctorId: doctor?.doctorId ?? null, input },
      {
        onSuccess: () => {
          toast({ tone: 'success', message: t('staff.doctors.saved') });
          onClose();
        },
        onError: showError,
      },
    ),
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={t(doctor ? 'staff.doctors.editTitle' : 'staff.doctors.addTitle')}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={t('staff.doctors.name')}
          {...register('name')}
          error={fieldError(formState.errors.name?.message)}
        />
        <Input
          label={t('staff.doctors.specialty')}
          {...register('specialty')}
          error={fieldError(formState.errors.specialty?.message)}
        />
        <Input
          label={t('staff.doctors.phone')}
          inputMode="tel"
          {...register('phone')}
          error={fieldError(formState.errors.phone?.message)}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
