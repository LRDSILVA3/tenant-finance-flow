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

// Mock HTMLCanvasElement.prototype.getContext for JsBarcode text measurement
if (typeof window !== 'undefined' && window.HTMLCanvasElement) {
  window.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    font: '',
    measureText: vi.fn().mockReturnValue({ width: 50 }),
  }) as any;
}

// Mock Web Audio API
class MockAudioContext {
  currentTime = 0;
  destination = {};
  createOscillator = vi.fn().mockReturnValue({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  createGain = vi.fn().mockReturnValue({
    gain: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
  });
}
if (typeof window !== 'undefined') {
  window.AudioContext = (window.AudioContext || MockAudioContext) as any;
  (window as any).webkitAudioContext = ((window as any).webkitAudioContext || MockAudioContext) as any;
}

// Node 22 localStorage experimental mock polyfill
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

const mockStorage = createLocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
