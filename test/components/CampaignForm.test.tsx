import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CampaignForm } from '../../components/CampaignForm';

describe('CampaignForm Component Validations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(<CampaignForm balanceUsdc="10.00" onSubmit={async () => {}} loading={false} />);

    expect(screen.getByLabelText(/Or Video MP4 URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Video Duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CTA Destination URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bid \/ View/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Budget/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deploy Campaign/i })).toBeInTheDocument();
  });

  it('validates USDC decimals format (max 6 decimal places)', async () => {
    const mockOnSubmit = vi.fn();
    render(<CampaignForm balanceUsdc="10.00" onSubmit={mockOnSubmit} loading={false} />);

    const bidInput = screen.getByLabelText(/Bid \/ View/i);
    const budgetInput = screen.getByLabelText(/Total Budget/i);
    const submitButton = screen.getByRole('button', { name: /Deploy Campaign/i });

    // Invalid format: 7 decimal places
    fireEvent.change(bidInput, { target: { value: '0.0000001' } });
    fireEvent.change(budgetInput, { target: { value: '5.00' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText(/USDC amounts must have at most 6 decimal places/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates budget against marketer available balance', async () => {
    const mockOnSubmit = vi.fn();
    render(<CampaignForm balanceUsdc="10.00" onSubmit={mockOnSubmit} loading={false} />);

    const budgetInput = screen.getByLabelText(/Total Budget/i);
    const submitButton = screen.getByRole('button', { name: /Deploy Campaign/i });

    // Budget exceeds balance
    fireEvent.change(budgetInput, { target: { value: '15.00' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates that bid cannot exceed total campaign budget', async () => {
    const mockOnSubmit = vi.fn();
    render(<CampaignForm balanceUsdc="20.00" onSubmit={mockOnSubmit} loading={false} />);

    const bidInput = screen.getByLabelText(/Bid \/ View/i);
    const budgetInput = screen.getByLabelText(/Total Budget/i);
    const submitButton = screen.getByRole('button', { name: /Deploy Campaign/i });

    // Bid exceeds budget
    fireEvent.change(bidInput, { target: { value: '5.00' } });
    fireEvent.change(budgetInput, { target: { value: '2.00' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText(/Bid per view cannot exceed total campaign budget/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates that video duration cannot exceed 30 seconds', async () => {
    const mockOnSubmit = vi.fn();
    render(<CampaignForm balanceUsdc="20.00" onSubmit={mockOnSubmit} loading={false} />);

    const durationInput = screen.getByLabelText(/Video Duration/i);
    const submitButton = screen.getByRole('button', { name: /Deploy Campaign/i });

    // Duration is 35 seconds (35000 ms)
    fireEvent.change(durationInput, { target: { value: '35000' } });

    await act(async () => {
      fireEvent.submit(submitButton.closest('form')!);
    });

    expect(screen.getByText(/Campaign videos cannot exceed 30 seconds/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits correctly for valid data', async () => {
    const mockOnSubmit = vi.fn();
    render(<CampaignForm balanceUsdc="10.00" onSubmit={mockOnSubmit} loading={false} />);

    const submitButton = screen.getByRole('button', { name: /Deploy Campaign/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith({
      mp4Url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blockchain-nodes-43034-large.mp4',
      durationMs: 15000,
      ctaUrl: 'https://molfi.fun',
      bidPerViewUsdc: '0.010000',
      budgetUsdc: '5.000000',
    });
  });
});
