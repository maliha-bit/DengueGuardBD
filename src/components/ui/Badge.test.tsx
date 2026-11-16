import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { Badge } from './Badge';
import { Pill } from './Pill';
import { StatCard } from './StatCard';

describe('Badge', () => {
  it.each(['risk-low', 'risk-medium', 'risk-high', 'emergency'] as const)(
    '%s always shows text and an icon (never colour alone)',
    (tone) => {
      render(<Badge tone={tone}>Label</Badge>);
      expect(screen.getByText('Label')).toBeInTheDocument();
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    },
  );

  it('plain tones have no icon by default', () => {
    render(<Badge tone="lime">+5%</Badge>);
    expect(screen.queryByTestId('badge-icon')).not.toBeInTheDocument();
  });
});

describe('Pill', () => {
  it('is a static span without onClick', () => {
    render(<Pill>Today</Pill>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is a toggle button with aria-pressed when interactive', async () => {
    const onClick = vi.fn();
    render(
      <Pill selected onClick={onClick}>
        Today
      </Pill>,
    );
    const pill = screen.getByRole('button', { name: 'Today' });
    expect(pill).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(pill);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('StatCard', () => {
  it('renders title, value and unit', () => {
    renderWithProviders(<StatCard title="Beds available" value={62} unit="beds" />);
    expect(screen.getByRole('heading', { name: 'Beds available' })).toBeInTheDocument();
    expect(screen.getByText('62')).toBeInTheDocument();
    expect(screen.getByText('beds')).toBeInTheDocument();
  });
});
