import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  test('renders pending badge with correct color', () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByText('Pendente');
    expect(badge).toBeInTheDocument();
  });

  test('renders completed badge', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  test('renders processing badge', () => {
    render(<StatusBadge status="processing" />);
    expect(screen.getByText('Processando')).toBeInTheDocument();
  });
});
