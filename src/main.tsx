import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';
import { i18nReady } from '@/lib/i18n';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// Wait for the saved language (Bangla loads on demand) so text never flashes in English.
void i18nReady.finally(() =>
  createRoot(root).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AppProviders>
    </StrictMode>,
  ),
);
