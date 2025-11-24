import '@testing-library/jest-dom';
import { afterAll, beforeAll } from 'vitest';

beforeAll(() => {
  console.log('Vitest Start');
});

afterAll(() => {
  console.log('Vitest End');
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver;
