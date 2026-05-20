import { afterEach, describe, expect, it } from 'vitest';

import { getApiBaseUrl } from './api-config';

const ENV_KEY = 'NEXT_PUBLIC_API_URL';

describe('getApiBaseUrl', () => {
  const original = process.env[ENV_KEY];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = original;
    }
  });

  it('defaults when unset', () => {
    delete process.env[ENV_KEY];
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  it('defaults when blank or whitespace-only', () => {
    process.env[ENV_KEY] = '';
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
    process.env[ENV_KEY] = '  \t ';
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  it('trims value and trailing slash', () => {
    process.env[ENV_KEY] = '  https://api.example.com/ ';
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });
});
