import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import Index from '@/app/(authorized)/(tabs)/index';
import { useAuthSession } from '@/providers/AuthProvider';

jest.mock('@/providers/AuthProvider', () => ({
  useAuthSession: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
  // Defer to useEffect so the callback fires after mount, not during render
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}));

const mockUser = {
  uid: 'test-uid-123',
  getIdToken: jest.fn(),
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  (useAuthSession as jest.Mock).mockReturnValue({ user: mockUser });
  mockUser.getIdToken.mockResolvedValue('mock-firebase-token');
  mockFetch.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ scans: [] }),
  });
});

describe('Home screen', () => {
  it('renders without crashing', async () => {
    const { getByText } = render(<Index />);
    await act(async () => {});
    expect(getByText('Home')).toBeTruthy();
  });

  it('fetches recent scans on mount for the signed-in user', async () => {
    render(<Index />);
    await act(async () => {});

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/test-uid-123/scans',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-firebase-token' },
      })
    );
  });

  it('displays "No recent scans yet." when the scans list is empty', async () => {
    const { getByText } = render(<Index />);
    await act(async () => {});
    expect(getByText('No recent scans yet.')).toBeTruthy();
  });

  it('displays scan items with their names and status badges', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        scans: [
          { id: '1', name: 'Peanut Butter', status: 'allergen' },
          { id: '2', name: 'Orange Juice', status: 'safe' },
        ],
      }),
    });

    const { getByText } = render(<Index />);
    await act(async () => {});

    expect(getByText('Peanut Butter')).toBeTruthy();
    expect(getByText('ALLERGEN')).toBeTruthy();
    expect(getByText('Orange Juice')).toBeTruthy();
    expect(getByText('SAFE')).toBeTruthy();
  });

  it('does not fetch scans when there is no signed-in user', async () => {
    (useAuthSession as jest.Mock).mockReturnValue({ user: null });

    render(<Index />);
    await act(async () => {});

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('opens the Quick Add modal when "Quick Add" is pressed', async () => {
    const { getByText } = render(<Index />);
    await act(async () => {});

    fireEvent.press(getByText('Quick Add'));

    expect(getByText('Add one allergen or intolerance without leaving Home.')).toBeTruthy();
  });

  it('POSTs to /allergens when Quick Add saves an allergen', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ scans: [] }) })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) });

    const { getByText, getByPlaceholderText } = render(<Index />);
    await act(async () => {});

    fireEvent.press(getByText('Quick Add'));
    fireEvent.changeText(getByPlaceholderText('e.g., peanuts'), 'Peanuts');

    await act(async () => {
      fireEvent.press(getByText('Save'));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/test-uid-123/allergens',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'peanuts' }),
      })
    );
  });

  it('POSTs to /intolerances when Quick Add type is switched to Intolerance', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ scans: [] }) })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) });

    const { getByText, getByPlaceholderText } = render(<Index />);
    await act(async () => {});

    fireEvent.press(getByText('Quick Add'));
    fireEvent.press(getByText('Intolerance'));
    fireEvent.changeText(getByPlaceholderText('e.g., lactose'), 'Lactose');

    await act(async () => {
      fireEvent.press(getByText('Save'));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/test-uid-123/intolerances',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'lactose' }),
      })
    );
  });

  it('trims and lowercases the value before POSTing', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ scans: [] }) })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) });

    const { getByText, getByPlaceholderText } = render(<Index />);
    await act(async () => {});

    fireEvent.press(getByText('Quick Add'));
    fireEvent.changeText(getByPlaceholderText('e.g., peanuts'), '  PEANUTS  ');

    await act(async () => {
      fireEvent.press(getByText('Save'));
    });

    const postCall = mockFetch.mock.calls.find(([url]: [string]) =>
      url.includes('/allergens')
    );
    expect(JSON.parse(postCall![1].body).name).toBe('peanuts');
  });

  it('navigates to /camera when Scan is pressed', async () => {
    const { getByText } = render(<Index />);
    await act(async () => {});

    fireEvent.press(getByText('Scan'));

    expect(mockPush).toHaveBeenCalledWith('/camera');
  });

  it('navigates to /profiles when Profile is pressed', async () => {
    const { getByText } = render(<Index />);
    await act(async () => {});

    fireEvent.press(getByText('Profile'));

    expect(mockPush).toHaveBeenCalledWith('/profiles');
  });
});
