import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { mockApi, mockBookingStore, mockChatFeedback } from '@/api/mock/handlers';
import { renderApp } from '@/test/render';

const input = () => screen.getByRole('textbox', { name: 'Your question' });
const log = () => screen.getByRole('log', { name: 'Conversation' });

async function ask(u: ReturnType<typeof userEvent.setup>, text: string) {
  await u.type(input(), `${text}{Enter}`);
}

describe('Chatbot (/chatbot)', () => {
  it('shows the assistant header, a "Not a diagnosis" note and 6 suggestions', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    expect(
      screen.getByRole('heading', { level: 1, name: 'DengueGuard Assistant' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Not a diagnosis')).toBeInTheDocument();
    const chips = within(
      await screen.findByRole('list', { name: 'Suggested questions' }),
    ).getAllByRole('button');
    expect(chips).toHaveLength(6);
    expect(chips[0]).toHaveTextContent('What are dengue symptoms?');

    await u.click(screen.getByRole('button', { name: 'বাংলা' }));
    expect(await screen.findByRole('button', { name: 'ডেঙ্গুর লক্ষণ কী?' })).toBeInTheDocument();
  });

  it('answers a suggested question with source chips and a disclaimer', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    await u.click(await screen.findByRole('button', { name: 'What are dengue symptoms?' }));
    expect(await within(log()).findByText(/sudden high fever/)).toBeInTheDocument();
    expect(within(log()).getByText('What are dengue symptoms?')).toBeInTheDocument();
    expect(within(log()).getByText('DGHS guideline')).toBeInTheDocument();
    expect(within(log()).getByText('WHO dengue fact sheet')).toBeInTheDocument();
    expect(within(log()).getByText('Not a diagnosis. Follow DGHS guidance.')).toBeInTheDocument();
    expect(input()).toBeEnabled();
  });

  it('a red flag blocks the normal answer and shows the emergency card', async () => {
    const spy = vi.spyOn(mockApi, 'sendChatMessage');
    const u = userEvent.setup();
    renderApp('/chatbot');
    await ask(u, 'My gums are bleeding. What are dengue symptoms?');

    const card = (
      await within(log()).findByRole('heading', { name: 'This may be an emergency' })
    ).closest('section') as HTMLElement;
    expect(within(card).getByText('Bleeding (gums, nose, vomit or stool)')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /999/ })).toHaveAttribute('href', 'tel:999');
    expect(within(card).getByRole('link', { name: /16263/ })).toHaveAttribute('href', 'tel:16263');
    expect(await within(card).findByText(/^Dhaka .*Hospital$/)).toBeInTheDocument();
    // The question never reached the chat service and no normal answer was shown.
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByText(/sudden high fever/)).not.toBeInTheDocument();
    expect(screen.queryByText('DGHS guideline')).not.toBeInTheDocument();

    await u.click(within(card).getByRole('button', { name: 'Open Emergency help' }));
    expect(await screen.findByRole('dialog', { name: 'Emergency help' })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('red flags in Bangla also block the answer, with the card in Bangla', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    await ask(u, 'বাচ্চা বারবার বমি করছে, কী করব?');
    expect(
      await within(log()).findByRole('heading', { name: 'এটি জরুরি অবস্থা হতে পারে' }),
    ).toBeInTheDocument();
    expect(within(log()).getByText('বারবার বমি')).toBeInTheDocument();
  });

  it('falls back for questions it does not know', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    await ask(u, 'Who won the cricket match?');
    expect(
      await within(log()).findByText("I'm not sure about that. Please talk to a doctor."),
    ).toBeInTheDocument();
    expect(within(log()).getByRole('link', { name: /Symptom checker/ })).toHaveAttribute(
      'href',
      '/symptoms',
    );
    expect(within(log()).getByRole('link', { name: /Find hospital/ })).toHaveAttribute(
      'href',
      '/hospitals',
    );
  });

  it('replies in Bangla when the user writes Bangla (UI in English)', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    await ask(u, 'ডেঙ্গুর লক্ষণ কী?');
    expect(await within(log()).findByText(/হঠাৎ তীব্র জ্বর/)).toBeInTheDocument();
    expect(within(log()).getByText('DGHS নির্দেশিকা')).toBeInTheDocument();
  });

  it('shows hospital and risk results as cards', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    await u.click(await screen.findByRole('button', { name: 'Find a hospital bed near me' }));
    const beds = await within(log()).findByRole('region', { name: 'Free beds in Dhaka' });
    expect((await within(beds).findAllByRole('link', { name: /See doctors/ })).length).toBe(3);
    expect(within(beds).getAllByText(/^General beds free:/).length).toBe(3);

    await ask(u, 'Which division has high risk today?');
    const risk = await within(log()).findByRole('region', { name: 'Highest risk today' });
    const mapLinks = await within(risk).findAllByRole('link', { name: /View on map/ });
    expect(mapLinks[0]).toHaveAttribute('href', expect.stringMatching(/^\/risk\?division=/));
    expect(within(risk).getAllByText(/risk$/).length).toBeGreaterThan(0);
  });

  it('shows labs for test questions', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    await u.click(await screen.findByRole('button', { name: 'Where can I get an NS1 test?' }));
    const labs = await within(log()).findByRole('region', { name: 'Dengue tests in Dhaka' });
    expect((await within(labs).findAllByText(/^NS1 · ৳/)).length).toBeGreaterThan(0);
  });

  it('the booking card never books without confirmation', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    const before = mockBookingStore().appointmentsFor('u-demo-1').length;
    await ask(u, 'Book an appointment with a doctor');
    const card = await within(log()).findByRole('region', { name: 'Doctor appointment' });
    expect(within(card).getByText('Nothing is booked until you confirm.')).toBeInTheDocument();

    await u.click(within(card).getByRole('button', { name: 'Book this time' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirm appointment' });
    expect(mockBookingStore().appointmentsFor('u-demo-1')).toHaveLength(before);
    await u.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockBookingStore().appointmentsFor('u-demo-1')).toHaveLength(before);

    await u.click(within(card).getByRole('button', { name: 'Book this time' }));
    const again = await screen.findByRole('dialog', { name: 'Confirm appointment' });
    const confirm = within(again).getByRole('button', { name: 'Confirm booking' });
    await waitFor(() => expect(confirm).toBeEnabled());
    await u.click(confirm);
    expect(await screen.findByRole('dialog', { name: 'Appointment booked' })).toBeInTheDocument();
    expect(mockBookingStore().appointmentsFor('u-demo-1')).toHaveLength(before + 1);
  });

  it('guests must log in before booking from the chat', async () => {
    window.history.replaceState(null, '', '/?as=guest');
    const u = userEvent.setup();
    renderApp('/chatbot');
    await ask(u, 'Book an appointment');
    const card = await within(log()).findByRole('region', { name: 'Doctor appointment' });
    await u.click(within(card).getByRole('button', { name: 'Book this time' }));
    expect(await screen.findByRole('dialog', { name: 'Log in to book' })).toBeInTheDocument();
  });

  it('keeps the chat for the session, saves it for logged-in users and clears it on New chat', async () => {
    const u = userEvent.setup();
    const first = renderApp('/chatbot');
    await ask(u, 'How much water should I drink?');
    await within(log()).findByText(/2\.5 to 3 litres/);
    await waitFor(async () => expect(await api.getChatHistory()).toHaveLength(2));

    first.unmount();
    renderApp('/chatbot');
    expect(within(log()).getByText(/2\.5 to 3 litres/)).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'New chat' }));
    expect(within(log()).queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('list', { name: 'Suggested questions' })).toBeInTheDocument();
    await waitFor(async () => expect(await api.getChatHistory()).toHaveLength(0));
  });

  it('stores thumbs up/down feedback and copies answers', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    await u.click(await screen.findByRole('button', { name: 'Which medicines should I avoid?' }));
    await within(log()).findByText(/Do not take ibuprofen/);

    const helpful = within(log()).getByRole('button', { name: 'Helpful' });
    await u.click(helpful);
    expect(helpful).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect([...mockChatFeedback().values()]).toEqual(['up']));

    await u.click(within(log()).getByRole('button', { name: 'Copy answer' }));
    // userEvent provides the clipboard stub.
    expect(await navigator.clipboard.readText()).toMatch(/^Do not take ibuprofen/);
    expect(await screen.findByText('Answer copied.')).toBeInTheDocument();
  });

  it('shows Retry when the chat service fails', async () => {
    window.history.replaceState(null, '', '/?mock=error');
    const u = userEvent.setup();
    renderApp('/chatbot');
    await ask(u, 'What are dengue symptoms?');
    expect(await within(log()).findByText(/I couldn't reply just now/)).toBeInTheDocument();
    expect(within(log()).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('uses Bangla digits in বাংলা mode', async () => {
    const u = userEvent.setup();
    renderApp('/chatbot');
    await u.click(screen.getByRole('button', { name: 'বাংলা' }));
    await u.click(await screen.findByRole('button', { name: 'আমার কাছে হাসপাতালের শয্যা খুঁজুন' }));
    const banglaLog = screen.getByRole('log', { name: 'কথোপকথন' });
    const beds = await within(banglaLog).findByRole('region', { name: 'ঢাকা-এ খালি শয্যা' });
    expect((await within(beds).findAllByText(/^সাধারণ শয্যা খালি: [০-৯]+/)).length).toBe(3);
    const latin = (banglaLog.textContent ?? '')
      .replace(/DGHS|WHO|NS1|CBC|IgM\/IgG/g, '')
      .match(/[0-9]/g);
    expect(latin).toBeNull();
  });

  it('is linked from the dashboard quick action', () => {
    renderApp('/');
    expect(screen.getByRole('link', { name: /Ask chatbot/ })).toHaveAttribute('href', '/chatbot');
  });
});
