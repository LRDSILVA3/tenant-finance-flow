import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserverMock as any;
global.ResizeObserver = ResizeObserverMock as any;

class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.IntersectionObserver = IntersectionObserverMock as any;
global.IntersectionObserver = IntersectionObserverMock as any;

// Mock window.HTMLElement.prototype.scrollIntoView
if (typeof window !== 'undefined' && window.HTMLElement) {
  window.HTMLElement.prototype.scrollIntoView = window.HTMLElement.prototype.scrollIntoView || vi.fn();
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
