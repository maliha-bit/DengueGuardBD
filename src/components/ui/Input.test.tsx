import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { Input } from './Input';
import { Select } from './Select';

describe('Input', () => {
  it('links the label and hint', () => {
    renderWithProviders(<Input label="Phone" hint="11 digits" />);
    const input = screen.getByLabelText('Phone');
    expect(input).toHaveAccessibleDescription('11 digits');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('shows the error instead of the hint and marks the field invalid', () => {
    renderWithProviders(<Input label="Phone" hint="11 digits" error="Invalid number" />);
    const input = screen.getByLabelText('Phone');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Invalid number');
    expect(screen.queryByText('11 digits')).not.toBeInTheDocument();
  });

  it('accepts typing', async () => {
    renderWithProviders(<Input label="Name" />);
    await userEvent.type(screen.getByLabelText('Name'), 'Rahim');
    expect(screen.getByLabelText('Name')).toHaveValue('Rahim');
  });
});

describe('Select', () => {
  it('renders options and supports selection', async () => {
    renderWithProviders(
      <Select
        label="Division"
        placeholder="Choose"
        defaultValue=""
        options={[
          { value: 'dhaka', label: 'Dhaka' },
          { value: 'sylhet', label: 'Sylhet' },
        ]}
        error="Required"
      />,
    );
    const select = screen.getByLabelText('Division');
    expect(select).toHaveAccessibleDescription('Required');
    await userEvent.selectOptions(select, 'sylhet');
    expect(select).toHaveValue('sylhet');
  });
});
