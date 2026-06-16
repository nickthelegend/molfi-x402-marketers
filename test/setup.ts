import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock URL.createObjectURL and URL.revokeObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('mock-object-url');
  window.URL.revokeObjectURL = vi.fn();
}
