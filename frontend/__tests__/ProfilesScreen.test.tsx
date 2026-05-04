import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import ProfilesScreen from '@/app/profiles';
import { useAuthSession } from '@/providers/AuthProvider';

jest.mock('@/providers/AuthProvider', () => ({
  useAuthSession: jest.fn(),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ back: mockBack })),
  // Defer to useEffect so the callback fires after mount, not during render
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}));

const mockSignOut = jest.fn();
const mockUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  getIdToken: jest.fn(),
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  (useAuthSession as jest.Mock).mockReturnValue({ user: mockUser, signOut: mockSignOut });
  mockUser.getIdToken.mockResolvedValue('mock-firebase-token');
  mockFetch.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ allergens: [], intolerances: [] }),
  });
});

describe('Profiles screen', () => {
  it('renders without crashing', async () => {
    const { getByText } = render(<ProfilesScreen />);
    await act(async () => {});
    expect(getByText('Profile')).toBeTruthy();
  });

  it('displays the signed-in user email', async () => {
    const { getByText } = render(<ProfilesScreen />);
    await act(async () => {});
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('fetches /allergies on mount for the signed-in user', async () => {
    render(<ProfilesScreen />);
    await act(async () => {});

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/test-uid-123/allergies',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-firebase-token' },
      })
    );
  });

  it('shows empty-state text when no allergens or intolerances exist', async () => {
    const { getByText } = render(<ProfilesScreen />);
    await act(async () => {});

    expect(getByText('No allergens added yet.')).toBeTruthy();
    expect(getByText('No intolerances added yet.')).toBeTruthy();
  });

  it('displays allergen chips returned from the API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ allergens: ['peanuts', 'shellfish'], intolerances: [] }),
    });

    const { getByText } = render(<ProfilesScreen />);
    await act(async () => {});

    expect(getByText('peanuts')).toBeTruthy();
    expect(getByText('shellfish')).toBeTruthy();
  });

  it('displays intolerance chips returned from the API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ allergens: [], intolerances: ['lactose', 'gluten'] }),
    });

    const { getByText } = render(<ProfilesScreen />);
    await act(async () => {});

    expect(getByText('lactose')).toBeTruthy();
    expect(getByText('gluten')).toBeTruthy();
  });

  it('opens the allergen action modal when the allergens Edit button is pressed', async () => {
    const { getAllByText, getByText } = render(<ProfilesScreen />);
    await act(async () => {});

    fireEvent.press(getAllByText('Edit')[0]);

    expect(getByText('Edit Allergens')).toBeTruthy();
  });

  it('opens the intolerance action modal when the intolerances Edit button is pressed', async () => {
    const { getAllByText, getByText } = render(<ProfilesScreen />);
    await act(async () => {});

    fireEvent.press(getAllByText('Edit')[1]);

    expect(getByText('Edit Intolerances')).toBeTruthy();
  });

  it('POSTs to /allergens when a new allergen is saved via the add modal', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ allergens: [], intolerances: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ allergens: ['peanuts'], intolerances: [] }),
      });

    const { getAllByText, getByText, getByPlaceholderText } = render(<ProfilesScreen />);
    await act(async () => {});

    fireEvent.press(getAllByText('Edit')[0]);
    fireEvent.press(getByText('Add Allergen'));
    fireEvent.changeText(getByPlaceholderText('e.g., peanuts'), 'peanuts');

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

  it('POSTs to /intolerances when a new intolerance is saved via the add modal', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ allergens: [], intolerances: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ allergens: [], intolerances: ['lactose'] }),
      });

    const { getAllByText, getByText, getByPlaceholderText } = render(<ProfilesScreen />);
    await act(async () => {});

    fireEvent.press(getAllByText('Edit')[1]);
    fireEvent.press(getByText('Add Intolerance'));
    fireEvent.changeText(getByPlaceholderText('e.g., lactose'), 'lactose');

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

  it('DELETEs an allergen when it is tapped in the delete modal', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ allergens: ['peanuts'], intolerances: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ allergens: [], intolerances: [] }),
      });

    const { getAllByText, getByText } = render(<ProfilesScreen />);
    await act(async () => {});

    fireEvent.press(getAllByText('Edit')[0]);
    fireEvent.press(getByText('Delete Allergen'));

    await act(async () => {
      // The chip (View) press is a no-op; the delete modal item (Pressable) triggers the delete.
      getAllByText('peanuts').forEach((el) => fireEvent.press(el));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/test-uid-123/allergens/peanuts',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('DELETEs an intolerance when it is tapped in the delete modal', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ allergens: [], intolerances: ['lactose'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ allergens: [], intolerances: [] }),
      });

    const { getAllByText, getByText } = render(<ProfilesScreen />);
    await act(async () => {});

    fireEvent.press(getAllByText('Edit')[1]);
    fireEvent.press(getByText('Delete Intolerance'));

    await act(async () => {
      getAllByText('lactose').forEach((el) => fireEvent.press(el));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/test-uid-123/intolerances/lactose',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('calls signOut when Log Out is pressed', async () => {
    const { getByText } = render(<ProfilesScreen />);
    await act(async () => {});
    fireEvent.press(getByText('Log Out'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('navigates back when Back is pressed', async () => {
    const { getByText } = render(<ProfilesScreen />);
    await act(async () => {});

    fireEvent.press(getByText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });
});
