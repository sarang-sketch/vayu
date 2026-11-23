import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AqiGauge } from './AqiGauge';

describe('AqiGauge', () => {
  it('renders the AQI value, category and dominant pollutant accessibly', () => {
    render(<AqiGauge aqi={415} category="severe" dominant="pm25" />);
    expect(
      screen.getByRole('img', { name: /air quality index 415, category severe/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('415')).toBeInTheDocument();
    expect(screen.getByText('SEVERE')).toBeInTheDocument();
    expect(screen.getByText('PM2.5')).toBeInTheDocument();
  });

  it('shows the good category for clean air', () => {
    render(<AqiGauge aqi={32} category="good" dominant="o3" />);
    expect(screen.getByText('GOOD')).toBeInTheDocument();
    expect(screen.getByText('O₃')).toBeInTheDocument();
  });
});
