# Testing Guide

This directory contains test utilities and configuration for GesthorAI.

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Writing Tests

### Basic Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, userEvent } from '@/test/utils';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<MyComponent onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Testing with Providers

```typescript
import { renderWithProviders } from '@/test/utils';

describe('MyComponent with providers', () => {
  it('renders with React Query', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { AllProviders } from '@/test/utils';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: AllProviders,
    });

    expect(result.current.data).toBeNull();
  });

  it('updates state correctly', async () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
```

### Testing with Supabase

```typescript
import { createMockSupabaseClient, mockUser } from '@/test/utils';

describe('Auth Component', () => {
  it('shows user info when authenticated', () => {
    const mockClient = setupAuthenticatedUser();

    // Mock the supabase import
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: mockClient,
    }));

    renderWithProviders(<UserProfile />);
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });
});
```

### Testing API Calls

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createMockSupabaseClient } from '@/test/utils';

describe('API Functions', () => {
  it('fetches leads correctly', async () => {
    const mockClient = createMockSupabaseClient();
    const mockLeads = [
      { id: '1', name: 'Lead 1' },
      { id: '2', name: 'Lead 2' },
    ];

    mockClient.from().select().mockResolvedValue({
      data: mockLeads,
      error: null,
    });

    // Your test code here
  });
});
```

## Test Structure

```
src/
├── test/
│   ├── setup.ts          # Global test setup
│   ├── utils.tsx         # Test utilities
│   └── README.md         # This file
├── components/
│   └── __tests__/        # Component tests
├── hooks/
│   └── __tests__/        # Hook tests
├── lib/
│   └── __tests__/        # Library tests
└── utils/
    └── __tests__/        # Utility tests
```

## Best Practices

### 1. Test File Naming

- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityName.test.ts`
- Place tests in `__tests__` directory or next to the file

### 2. Test Organization

```typescript
describe('ComponentName', () => {
  describe('rendering', () => {
    it('renders correctly', () => {});
    it('renders with props', () => {});
  });

  describe('user interactions', () => {
    it('handles click', async () => {});
    it('handles input', async () => {});
  });

  describe('edge cases', () => {
    it('handles error state', () => {});
    it('handles loading state', () => {});
  });
});
```

### 3. AAA Pattern

Always follow Arrange-Act-Assert:

```typescript
it('does something', async () => {
  // Arrange: Setup test data and mocks
  const mockData = { id: 1, name: 'Test' };
  const handleClick = vi.fn();

  // Act: Perform the action
  render(<Component data={mockData} onClick={handleClick} />);
  await userEvent.click(screen.getByRole('button'));

  // Assert: Check the results
  expect(handleClick).toHaveBeenCalledWith(mockData);
});
```

### 4. What to Test

✅ **DO TEST:**
- Component rendering
- User interactions
- Props variations
- Edge cases and error states
- Accessibility
- Business logic
- Hooks behavior

❌ **DON'T TEST:**
- Implementation details
- Third-party libraries
- Styling (use visual regression tools)
- Trivial code

### 5. Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 6. Snapshot Testing (Use Sparingly)

```typescript
it('matches snapshot', () => {
  const { container } = render(<MyComponent />);
  expect(container).toMatchSnapshot();
});
```

**Note**: Only use snapshots for components that rarely change.

## Mocking

### Mock Modules

```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));
```

### Mock Functions

```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue('test');
mockFn.mockResolvedValue({ data: 'test' });
mockFn.mockRejectedValue(new Error('test error'));
```

### Mock Timers

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('works with timers', () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);

  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
```

## Coverage Goals

- **Statements**: 70%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+

### View Coverage

```bash
npm run test:coverage
```

Then open `coverage/index.html` in your browser.

## CI/CD Integration

Tests run automatically on:
- Every push
- Every pull request
- Before deployment

See `.github/workflows/ci.yml` for configuration.

## Debugging Tests

### Using Vitest UI

```bash
npm run test:ui
```

This opens an interactive UI to debug tests.

### Using VS Code

Install the "Vitest" extension and set breakpoints.

### Console Debugging

```typescript
import { screen, debug } from '@testing-library/react';

it('debugs output', () => {
  render(<MyComponent />);

  // Print entire DOM
  screen.debug();

  // Print specific element
  debug(screen.getByRole('button'));
});
```

## Common Issues

### Issue: "Cannot find module"

**Solution**: Check your `tsconfig.json` paths and Vitest config.

### Issue: "localStorage is not defined"

**Solution**: Already mocked in `setup.ts`.

### Issue: "matchMedia is not a function"

**Solution**: Already mocked in `setup.ts`.

### Issue: Tests timeout

**Solution**: Increase timeout or check for unresolved promises.

```typescript
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [React Testing Examples](https://github.com/testing-library/react-testing-library/tree/main/examples)

## Getting Help

- Check the test examples in `__tests__` directories
- Read component documentation
- Ask in the #engineering Slack channel
- Review PR comments for testing feedback

---

Happy Testing! 🧪
