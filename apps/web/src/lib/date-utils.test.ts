import { describe, expect, it } from 'bun:test';
import { getPeriodStart, getPeriodEnd } from './date-utils';

describe('getPeriodStart', () => {
  it('returns the same date for daily period', () => {
    const base = new Date('2026-01-26T12:00:00Z');
    expect(getPeriodStart('daily', base)).toBe('2026-01-26');
  });

  it('returns Monday for weekly period (mid-week)', () => {
    // 2026-01-28 is Wednesday
    const wednesday = new Date('2026-01-28T12:00:00Z');
    expect(getPeriodStart('weekly', wednesday)).toBe('2026-01-26');
  });

  it('returns Monday for weekly period (Sunday)', () => {
    // 2026-02-01 is Sunday
    const sunday = new Date('2026-02-01T12:00:00Z');
    expect(getPeriodStart('weekly', sunday)).toBe('2026-01-26');
  });

  it('returns first day of month for monthly period', () => {
    const base = new Date('2026-01-26T12:00:00Z');
    expect(getPeriodStart('monthly', base)).toBe('2026-01-01');
  });

  it('returns epoch for all_time period', () => {
    expect(getPeriodStart('all_time')).toBe('2024-01-01');
  });
});

describe('getPeriodEnd', () => {
  it('returns next day for daily period', () => {
    const base = new Date('2026-01-26T12:00:00Z');
    expect(getPeriodEnd('daily', base)).toBe('2026-01-27');
  });

  it('handles month boundary for daily period', () => {
    const base = new Date('2026-01-31T12:00:00Z');
    expect(getPeriodEnd('daily', base)).toBe('2026-02-01');
  });

  it('returns next Monday for weekly period (mid-week)', () => {
    // 2026-01-28 is Wednesday, Monday of that week is Jan 26
    // Next Monday = Jan 26 + 7 = Feb 2
    const wednesday = new Date('2026-01-28T12:00:00Z');
    expect(getPeriodEnd('weekly', wednesday)).toBe('2026-02-02');
  });

  it('returns next Monday for weekly period (Sunday)', () => {
    // 2026-02-01 is Sunday, Monday of that week is Jan 26
    // Next Monday = Jan 26 + 7 = Feb 2
    const sunday = new Date('2026-02-01T12:00:00Z');
    expect(getPeriodEnd('weekly', sunday)).toBe('2026-02-02');
  });

  it('returns first day of next month for monthly period', () => {
    const base = new Date('2026-01-26T12:00:00Z');
    expect(getPeriodEnd('monthly', base)).toBe('2026-02-01');
  });

  it('handles December to January for monthly period', () => {
    const base = new Date('2026-12-15T12:00:00Z');
    expect(getPeriodEnd('monthly', base)).toBe('2027-01-01');
  });

  it('returns far future for all_time period', () => {
    expect(getPeriodEnd('all_time')).toBe('2099-12-31');
  });
});

describe('getPeriodStart + getPeriodEnd consistency', () => {
  it('daily period end is exactly 1 day after start', () => {
    const base = new Date('2026-01-26T12:00:00Z');
    const start = new Date(getPeriodStart('daily', base));
    const end = new Date(getPeriodEnd('daily', base));
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(1);
  });

  it('weekly period end is exactly 7 days after start', () => {
    const base = new Date('2026-01-28T12:00:00Z');
    const start = new Date(getPeriodStart('weekly', base));
    const end = new Date(getPeriodEnd('weekly', base));
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it('monthly period start and end do not overlap', () => {
    // January and February should have distinct boundaries
    const jan = new Date('2026-01-15T12:00:00Z');
    const feb = new Date('2026-02-15T12:00:00Z');

    const janEnd = getPeriodEnd('monthly', jan);
    const febStart = getPeriodStart('monthly', feb);

    expect(janEnd).toBe(febStart); // Jan end === Feb start (exclusive boundary)
  });
});
