import { useCallback } from 'react';
import { isStaffError } from '@/api/mock/staffStore';
import { useToast } from '@/components/ui';
import { useLocale } from '@/lib/useLocale';

/** Error toast for a failed staff action, with a specific message for known rule errors. */
export function useStaffError() {
  const { t } = useLocale();
  const toast = useToast();
  return useCallback(
    (error: unknown) =>
      toast({
        tone: 'error',
        message: isStaffError(error) ? t(`staff.errors.${error.code}`) : t('staff.errors.generic'),
      }),
    [t, toast],
  );
}
