import '@testing-library/jest-dom';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.HTMLElement.prototype.scrollIntoView = function () {};

global.ResizeObserver = MockResizeObserver;
