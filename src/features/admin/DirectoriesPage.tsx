import { useMemo, useState, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Droplet,
  FlaskConical,
  Pencil,
  Power,
  Search,
  SearchX,
  Users,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDivisions } from '@/api/queries';
import {
  useDirectoryDonors,
  useDirectoryHospitals,
  useDirectoryLabs,
  useDirectoryUsers,
  useEditDirectoryItem,
  useSetDirectoryActive,
} from '@/api/staffQueries';
import type { DirectoryKind, DivisionId, LocalizedText, Role } from '@/api/types';
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
  Pagination,
  pageCount,
  paginate,
  Pill,
  Select,
  SkeletonCard,
  useToast,
  type DataColumn,
} from '@/components/ui';
import { localDigits } from '@/lib/format';
import { nameField, phoneField } from '@/lib/staffSchemas';
import { useLocale } from '@/lib/useLocale';

/** One directory row, the same shape for hospitals, labs, users and donors. */
interface Row {
  id: string;
  name: LocalizedText;
  phone: string;
  divisionId: DivisionId;
  active: boolean;
  /** Extra column: type, role or blood group. */
  detail: string;
  role?: Role;
}

const KINDS: DirectoryKind[] = ['hospital', 'lab', 'user', 'donor'];
const ICONS = { hospital: Building2, lab: FlaskConical, user: Users, donor: Droplet } as const;

/** Directories of hospitals, labs, users and donors: search, filters, pages, edit, deactivate. */
export default function DirectoriesPage() {
  const { t } = useLocale();
  const [kind, setKind] = useState<DirectoryKind>('hospital');
  return (
    <>
      <PageHeader
        title={t('staff.directories.title')}
        subtitle={t('staff.directories.subtitle')}
        actions={
          <div
            role="group"
            aria-label={t('staff.directories.kindLabel')}
            className="flex flex-wrap gap-1"
          >
            {KINDS.map((k) => (
              <Pill key={k} selected={kind === k} leadingIcon={ICONS[k]} onClick={() => setKind(k)}>
                {t(`staff.directories.kinds.${k}`)}
              </Pill>
            ))}
          </div>
        }
      />
      {kind === 'hospital' && <HospitalDirectory />}
      {kind === 'lab' && <LabDirectory />}
      {kind === 'user' && <UserDirectory />}
      {kind === 'donor' && <DonorDirectory />}
    </>
  );
}

function HospitalDirectory() {
  const { t } = useLocale();
  const query = useDirectoryHospitals();
  const rows = useMemo<Row[] | undefined>(
    () =>
      query.data?.map(({ hospital, active }) => ({
        id: hospital.hospitalId,
        name: hospital.name,
        phone: hospital.phone,
        divisionId: hospital.divisionId,
        active,
        detail: t(`staff.directories.types.${hospital.type}`),
      })),
    [query.data, t],
  );
  return <Directory kind="hospital" query={query} rows={rows} />;
}

function LabDirectory() {
  const { t } = useLocale();
  const query = useDirectoryLabs();
  const rows = useMemo<Row[] | undefined>(
    () =>
      query.data?.map(({ lab, active }) => ({
        id: lab.labId,
        name: lab.name,
        phone: lab.phone,
        divisionId: lab.divisionId,
        active,
        detail: t(`staff.directories.types.${lab.type}`),
      })),
    [query.data, t],
  );
  return <Directory kind="lab" query={query} rows={rows} />;
}

function UserDirectory() {
  const { t } = useLocale();
  const query = useDirectoryUsers();
  const rows = useMemo<Row[] | undefined>(
    () =>
      query.data?.map((u) => ({
        id: u.userId,
        name: u.name,
        phone: u.phone,
        divisionId: u.divisionId,
        active: u.active,
        detail: t(`roles.${u.role}`),
        role: u.role,
      })),
    [query.data, t],
  );
  return <Directory kind="user" query={query} rows={rows} />;
}

function DonorDirectory() {
  const query = useDirectoryDonors();
  const rows = useMemo<Row[] | undefined>(
    () =>
      query.data?.map(({ donor, active }) => ({
        id: donor.donorId,
        name: donor.name,
        phone: donor.maskedPhone,
        divisionId: donor.divisionId,
        active,
        detail: donor.bloodGroup,
      })),
    [query.data],
  );
  return <Directory kind="donor" query={query} rows={rows} />;
}

function Directory({
  kind,
  query,
  rows,
}: {
  kind: DirectoryKind;
  query: UseQueryResult<unknown>;
  rows: Row[] | undefined;
}) {
  const { t, l, n, lang } = useLocale();
  const divisions = useDivisions();
  const toast = useToast();
  const showError = useStaffError();
  const setActive = useSetDirectoryActive(kind);
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deactivating, setDeactivating] = useState<Row | null>(null);

  const term = search.trim().toLowerCase();
  const filtered = (rows ?? []).filter(
    (r) =>
      (!term ||
        r.name.en.toLowerCase().includes(term) ||
        r.name.bn.includes(term) ||
        r.phone.includes(term)) &&
      (!division || r.divisionId === division) &&
      (!status || (status === 'active') === r.active) &&
      (!role || r.role === role),
  );
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const toggle = (row: Row, active: boolean) =>
    setActive.mutate(
      { id: row.id, active },
      {
        onSuccess: () => {
          toast({
            tone: 'success',
            message: t(active ? 'staff.directories.activated' : 'staff.directories.deactivated', {
              name: l(row.name),
            }),
          });
          setDeactivating(null);
        },
        onError: showError,
      },
    );
  const divisionName = (id: DivisionId) => {
    const found = divisions.data?.find((d) => d.divisionId === id);
    return found ? l(found.name) : id;
  };

  const columns: DataColumn<Row>[] = [
    { key: 'name', header: t('staff.directories.name'), primary: true, cell: (r) => l(r.name) },
    { key: 'detail', header: t(`staff.directories.detail.${kind}`), cell: (r) => r.detail },
    {
      key: 'division',
      header: t('staff.directories.division'),
      cell: (r) => divisionName(r.divisionId),
    },
    { key: 'phone', header: t('staff.directories.phone'), cell: (r) => localDigits(r.phone, lang) },
    {
      key: 'status',
      header: t('staff.common.status'),
      cell: (r) => (
        <Badge tone={r.active ? 'lime' : 'neutral'}>
          {t(r.active ? 'staff.common.active' : 'staff.common.inactive')}
        </Badge>
      ),
    },
  ];
  const label: ReactNode = t(`staff.directories.kinds.${kind}`);

  return (
    <Card title={label} icon={ICONS[kind]} titleAs="h2">
      <div
        className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        role="group"
        aria-label={t('staff.directories.filters')}
      >
        <Input
          type="search"
          leadingIcon={Search}
          label={t('common.search')}
          placeholder={t('staff.directories.searchPlaceholder')}
          value={search}
          onChange={(e) => filter(() => setSearch(e.target.value))}
        />
        <Select
          label={t('staff.directories.division')}
          value={division}
          onChange={(e) => filter(() => setDivision(e.target.value))}
          options={[
            { value: '', label: t('staff.common.all') },
            ...(divisions.data ?? []).map((d) => ({ value: d.divisionId, label: l(d.name) })),
          ]}
        />
        <Select
          label={t('staff.common.status')}
          value={status}
          onChange={(e) => filter(() => setStatus(e.target.value))}
          options={[
            { value: '', label: t('staff.common.all') },
            { value: 'active', label: t('staff.common.active') },
            { value: 'inactive', label: t('staff.common.inactive') },
          ]}
        />
        {kind === 'user' && (
          <Select
            label={t('staff.directories.role')}
            value={role}
            onChange={(e) => filter(() => setRole(e.target.value))}
            options={[
              { value: '', label: t('staff.common.all') },
              ...(
                ['citizen', 'donor', 'hospital_staff', 'lab_staff', 'authority', 'admin'] as const
              ).map((r) => ({
                value: r,
                label: t(`roles.${r}`),
              })),
            ]}
          />
        )}
      </div>
      <QueryState
        query={query}
        skeleton={<SkeletonCard />}
        isEmpty={() => (rows ?? []).length === 0}
        empty={<EmptyState icon={ICONS[kind]} title={t('staff.directories.emptyTitle')} />}
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState compact icon={SearchX} title={t('staff.directories.noMatch')} />
          ) : (
            <>
              <p className="mb-2 text-xs text-brand-muted" aria-live="polite">
                {t('staff.directories.count', { value: n(filtered.length) })}
              </p>
              <DataTable
                caption={t('staff.directories.tableCaption', {
                  kind: t(`staff.directories.kinds.${kind}`),
                })}
                rows={paginate(filtered, page)}
                rowKey={(r) => r.id}
                columns={columns}
                actions={(r) => (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      leadingIcon={Pencil}
                      aria-label={t('staff.common.editNamed', { name: l(r.name) })}
                      onClick={() => setEditing(r)}
                    >
                      {t('staff.common.edit')}
                    </Button>
                    {r.active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        leadingIcon={Power}
                        aria-label={t('staff.common.deactivateNamed', { name: l(r.name) })}
                        onClick={() => setDeactivating(r)}
                      >
                        {t('staff.common.deactivate')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        leadingIcon={Power}
                        loading={setActive.isPending && setActive.variables?.id === r.id}
                        onClick={() => toggle(r, true)}
                      >
                        {t('staff.common.activate')}
                      </Button>
                    )}
                  </>
                )}
              />
              <Pagination page={page} pages={pageCount(filtered.length)} onChange={setPage} />
            </>
          )
        }
      </QueryState>
      {editing && <EditModal kind={kind} row={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={deactivating !== null}
        title={t('staff.directories.deactivateTitle')}
        message={t('staff.directories.deactivateBody', {
          name: deactivating ? l(deactivating.name) : '',
        })}
        confirmLabel={t('staff.common.deactivate')}
        loading={setActive.isPending}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && toggle(deactivating, false)}
      />
    </Card>
  );
}

const editSchema = z.object({ name: nameField, nameBn: nameField, phone: phoneField });
type EditForm = z.input<typeof editSchema>;

function EditModal({ kind, row, onClose }: { kind: DirectoryKind; row: Row; onClose: () => void }) {
  const { t, l } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const fieldError = useFieldError();
  const edit = useEditDirectoryItem(kind);
  const { register, handleSubmit, formState } = useForm<
    EditForm,
    unknown,
    z.output<typeof editSchema>
  >({
    resolver: zodResolver(editSchema),
    // Donor phones are masked in the directory: the admin types a new one.
    defaultValues: {
      name: row.name.en,
      nameBn: row.name.bn,
      phone: kind === 'donor' ? '' : row.phone,
    },
  });
  const onSubmit = handleSubmit((input) =>
    edit.mutate(
      { id: row.id, input },
      {
        onSuccess: () => {
          toast({ tone: 'success', message: t('staff.directories.saved', { name: input.name }) });
          onClose();
        },
        onError: showError,
      },
    ),
  );
  return (
    <Modal open onClose={onClose} title={t('staff.directories.editTitle', { name: l(row.name) })}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={t('staff.directories.nameEn')}
          {...register('name')}
          error={fieldError(formState.errors.name?.message)}
        />
        <Input
          label={t('staff.directories.nameBn')}
          lang="bn"
          {...register('nameBn')}
          error={fieldError(formState.errors.nameBn?.message)}
        />
        <Input
          label={t('staff.directories.phone')}
          inputMode="tel"
          hint={kind === 'donor' ? t('staff.directories.donorPhoneHint') : undefined}
          {...register('phone')}
          error={fieldError(formState.errors.phone?.message)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={edit.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
