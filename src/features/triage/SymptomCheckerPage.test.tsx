import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

const user = () => userEvent.setup();

async function answerUpToWarningSigns(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole('button', { name: 'I understand' }));
  await u.click(screen.getByRole('radio', { name: '15 to 59 years' }));
  await u.click(screen.getByRole('button', { name: 'Next' }));
  await u.click(screen.getByRole('radio', { name: '1 to 2 days' }));
  await u.click(screen.getByRole('button', { name: 'Next' }));
  // No symptoms ticked.
  await u.click(screen.getByRole('button', { name: 'None of these, next' }));
}

describe('Symptom checker (/symptoms)', () => {
  it('starts with the non-diagnosis notice and shows progress with Back', async () => {
    const u = user();
    renderApp('/symptoms');
    expect(
      screen.getByRole('heading', { name: 'Not a diagnosis. Follow DGHS guidance.' }),
    ).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'I understand' }));

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await u.click(screen.getByRole('radio', { name: 'Under 5 years' }));
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('radio', { name: 'Under 5 years' })).toBeChecked();
  });

  it('opens the Emergency sheet immediately when a warning sign is ticked', async () => {
    const u = user();
    renderApp('/symptoms');
    await answerUpToWarningSigns(u);
    await u.click(screen.getByRole('checkbox', { name: 'Severe belly pain' }));
    await u.click(screen.getByRole('button', { name: 'See result' }));

    const sheet = await screen.findByRole('dialog', { name: 'Emergency help' });
    expect(within(sheet).getByRole('link', { name: /999/ })).toHaveAttribute('href', 'tel:999');
    expect(within(sheet).getByRole('link', { name: /16263/ })).toHaveAttribute('href', 'tel:16263');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Go to emergency now' }),
    ).toBeInTheDocument();

    // Esc closes the sheet; the red card can open it again.
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Open emergency help' }));
    expect(await screen.findByRole('dialog', { name: 'Emergency help' })).toBeInTheDocument();
  });

  it('shows "Monitor at home" with links to home care and the fever log', async () => {
    const u = user();
    renderApp('/symptoms');
    await answerUpToWarningSigns(u);
    await u.click(screen.getByRole('button', { name: 'None of these, next' }));
    await u.click(screen.getByRole('button', { name: 'See result' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Monitor at home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Home care guide/ })).toHaveAttribute(
      'href',
      '/home-care',
    );
    expect(screen.getByRole('link', { name: /Open fever log/ })).toHaveAttribute(
      'href',
      '/fever-log',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Saved to your account.')).toBeInTheDocument();

    // The saved result appears on the start screen.
    await u.click(screen.getByRole('button', { name: 'Start again' }));
    const last = (await screen.findByRole('heading', { name: 'Your last check' })).closest(
      'section',
    ) as HTMLElement;
    expect(await within(last).findByText('Monitor at home')).toBeInTheDocument();
  });

  it('shows "Book a doctor" with links to hospitals and appointments', async () => {
    const u = user();
    renderApp('/symptoms');
    await u.click(screen.getByRole('button', { name: 'I understand' }));
    await u.click(screen.getByRole('radio', { name: '15 to 59 years' }));
    await u.click(screen.getByRole('button', { name: 'Next' }));
    await u.click(screen.getByRole('radio', { name: '3 to 5 days' }));
    await u.click(screen.getByRole('button', { name: 'Next' }));
    await u.click(screen.getByRole('button', { name: 'None of these, next' }));
    await u.click(screen.getByRole('button', { name: 'None of these, next' }));
    await u.click(screen.getByRole('button', { name: 'See result' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Book a doctor' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Book a doctor/ })).toHaveAttribute(
      'href',
      '/hospitals?division=dhaka',
    );
  });

  it("does not save guests' results", async () => {
    window.history.replaceState(null, '', '/?as=guest');
    const u = user();
    renderApp('/symptoms');
    expect(screen.getByText(/your result won't be saved/)).toBeInTheDocument();
    await answerUpToWarningSigns(u);
    await u.click(screen.getByRole('button', { name: 'None of these, next' }));
    await u.click(screen.getByRole('button', { name: 'See result' }));
    expect(screen.getByText('Not saved. Log in to keep your result.')).toBeInTheDocument();
  });

  it('uses Bangla text and digits in বাংলা mode', async () => {
    const u = user();
    renderApp('/symptoms');
    await u.click(screen.getByRole('button', { name: 'বাংলা' }));
    await u.click(screen.getByRole('button', { name: 'আমি বুঝেছি' }));
    expect(screen.getByText('প্রশ্ন ১ / ৫')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '১৫ থেকে ৫৯ বছর' })).toBeInTheDocument();
    const latin = (screen.getByRole('main').textContent ?? '')
      .replace(/DGHS|WHO/g, '')
      .match(/[0-9]/g);
    expect(latin).toBeNull();
  });

  it('the dashboard and old URL lead here', async () => {
    renderApp('/symptom-checker');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'Symptom checker' }),
      ).toBeInTheDocument(),
    );
  });
});
