import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useKnowledgeSources,
  useRemoveKnowledgeSource,
  useSaveKnowledgeSource,
} from '@/api/staffQueries';
import type { KnowledgeSource } from '@/api/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { QueryState } from '@/components/QueryState';
import { useFieldError } from '@/components/useFieldError';
import { useStaffError } from '@/components/useStaffError';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Modal,
  SkeletonCard,
  useToast,
} from '@/components/ui';
import { toIsoDate } from '@/lib/format';
import { isoDateField } from '@/lib/staffSchemas';
import { useLocale } from '@/lib/useLocale';

const sourceSchema = z.object({
  title: z.string().trim().min(3, 'tooShort').max(160, 'tooLong'),
  publisher: z.string().trim().min(2, 'tooShort').max(80, 'tooLong'),
  url: z
    .string()
    .trim()
    .url('url')
    .refine((v) => /^https:\/\//.test(v), 'url'),
  reviewedOn: isoDateField.refine((v) => v <= toIsoDate(new Date()), 'date'),
});
type SourceForm = z.infer<typeof sourceSchema>;

/** Chatbot knowledge sources: add, edit, remove. */
export default function KnowledgePage() {
  const { t, d } = useLocale();
  const query = useKnowledgeSources();
  const remove = useRemoveKnowledgeSource();
  const toast = useToast();
  const showError = useStaffError();
  const [editing, setEditing] = useState<KnowledgeSource | 'new' | null>(null);
  const [removing, setRemoving] = useState<KnowledgeSource | null>(null);

  return (
    <>
      <PageHeader
        title={t('staff.knowledge.title')}
        subtitle={t('staff.knowledge.subtitle')}
        actions={
          <Button size="sm" leadingIcon={Plus} onClick={() => setEditing('new')}>
            {t('staff.knowledge.add')}
          </Button>
        }
      />
      <Card title={t('staff.knowledge.listTitle')} icon={BookOpen} titleAs="h2">
        <QueryState
          query={query}
          skeleton={<SkeletonCard />}
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              icon={BookOpen}
              title={t('staff.knowledge.emptyTitle')}
              message={t('staff.knowledge.emptyMessage')}
            />
          }
        >
          {(sources) => (
            <DataTable
              caption={t('staff.knowledge.listTitle')}
              rows={sources}
              rowKey={(s) => s.sourceId}
              columns={[
                {
                  key: 'title',
                  header: t('staff.knowledge.sourceTitle'),
                  primary: true,
                  cell: (s) => s.title,
                },
                {
                  key: 'publisher',
                  header: t('staff.knowledge.publisher'),
                  cell: (s) => s.publisher,
                },
                {
                  key: 'url',
                  header: t('staff.knowledge.url'),
                  cell: (s) => (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all underline"
                    >
                      {new URL(s.url).hostname}
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ),
                },
                {
                  key: 'reviewed',
                  header: t('staff.knowledge.reviewedOn'),
                  cell: (s) => d(s.reviewedOn),
                },
              ]}
              actions={(s) => (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    leadingIcon={Pencil}
                    aria-label={t('staff.common.editNamed', { name: s.title })}
                    onClick={() => setEditing(s)}
                  >
                    {t('staff.common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leadingIcon={Trash2}
                    aria-label={t('staff.knowledge.removeNamed', { name: s.title })}
                    onClick={() => setRemoving(s)}
                  >
                    {t('staff.knowledge.remove')}
                  </Button>
                </>
              )}
            />
          )}
        </QueryState>
      </Card>
      {editing && (
        <SourceModal source={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={removing !== null}
        title={t('staff.knowledge.removeTitle')}
        message={t('staff.knowledge.removeBody', { name: removing?.title ?? '' })}
        confirmLabel={t('staff.knowledge.remove')}
        loading={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.sourceId, {
            onSuccess: () => {
              toast({
                tone: 'success',
                message: t('staff.knowledge.removed', { name: removing.title }),
              });
              setRemoving(null);
            },
            onError: showError,
          })
        }
      />
    </>
  );
}

function SourceModal({ source, onClose }: { source: KnowledgeSource | null; onClose: () => void }) {
  const { t } = useLocale();
  const toast = useToast();
  const showError = useStaffError();
  const fieldError = useFieldError();
  const save = useSaveKnowledgeSource();
  const { register, handleSubmit, formState } = useForm<SourceForm>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      title: source?.title ?? '',
      publisher: source?.publisher ?? '',
      url: source?.url ?? 'https://',
      reviewedOn: source?.reviewedOn ?? toIsoDate(new Date()),
    },
  });
  const onSubmit = handleSubmit((input) =>
    save.mutate(
      { sourceId: source?.sourceId ?? null, input },
      {
        onSuccess: () => {
          toast({ tone: 'success', message: t('staff.knowledge.saved') });
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
      title={t(source ? 'staff.knowledge.editTitle' : 'staff.knowledge.addTitle')}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={t('staff.knowledge.sourceTitle')}
          {...register('title')}
          error={fieldError(formState.errors.title?.message)}
        />
        <Input
          label={t('staff.knowledge.publisher')}
          {...register('publisher')}
          error={fieldError(formState.errors.publisher?.message)}
        />
        <Input
          label={t('staff.knowledge.url')}
          type="url"
          inputMode="url"
          {...register('url')}
          error={fieldError(formState.errors.url?.message)}
        />
        <Input
          label={t('staff.knowledge.reviewedOn')}
          type="date"
          {...register('reviewedOn')}
          error={fieldError(formState.errors.reviewedOn?.message)}
        />
        <div className="flex justify-end gap-2">
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
