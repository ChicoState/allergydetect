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
}));

const mockUser = {
  uid: 'test-uid-123',
  getIdToken: jest.fn().mockResolvedValue('mock-firebase-token'),
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthSession as jest.Mock).mockReturnValue({ user: mockUser });
  mockUser.getIdToken.mockResolvedValue('mock-firebase-token');
});

describe('Home screen', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<Index />);
    expect(getByText('Home screen')).toBeTruthy();
  });

  it('saveAllergies POSTs parsed allergens and intolerances to the API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ message: 'saved' }),
    });

    const { getByText, getByPlaceholderText } = render(<Index />);

    fireEvent.changeText(
      getByPlaceholderText('Allergens (e.g., peanuts, milk)'),
      'Peanuts, Milk'
    );
    fireEvent.changeText(
      getByPlaceholderText('Intolerances (e.g., lactose, gluten)'),
      'Lactose'
    );

    await act(async () => {
      fireEvent.press(getByText('Save Allergies'));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/users/test-uid-123/allergies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ allergens: ['peanuts', 'milk'], intolerances: ['lactose'] }),
      })
    );
  });

  it('saveAllergies trims and lowercases allergen entries', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ message: 'saved' }),
    });

    const { getByText, getByPlaceholderText } = render(<Index />);

    fireEvent.changeText(
      getByPlaceholderText('Allergens (e.g., peanuts, milk)'),
      '  PEANUTS ,  SOY  '
    );

    await act(async () => {
      fireEvent.press(getByText('Save Allergies'));
    });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
    expect(body.allergens).toEqual(['peanuts', 'soy']);
  });

  it('saveAllergies does nothing when there is no user', async () => {
    (useAuthSession as jest.Mock).mockReturnValue({ user: null });

    const { getByText } = render(<Index />);

    await act(async () => {
      fireEvent.press(getByText('Save Allergies'));
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('Test UPC button fetches ingredients for the test barcode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          ingredients: ['water', 'salt'],
          containsAllergens: [],
          containsIntolerances: [],
          safe: true,
        })
      ),
    });

    const { getByText } = render(<Index />);

    await act(async () => {
      fireEvent.press(getByText('Test UPC'));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/ingredients/894700010021/test-uid-123',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-firebase-token' },
      })
    );
  });

  it('displays SAFE when no allergens are found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          ingredients: ['water'],
          containsAllergens: [],
          containsIntolerances: [],
          safe: true,
        })
      ),
    });

    const { getByText } = render(<Index />);

    await act(async () => {
      fireEvent.press(getByText('Test UPC'));
    });

    expect(getByText(/SAFE/)).toBeTruthy();
  });

  it('displays allergen warning when allergens are found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          ingredients: ['peanut oil', 'water'],
          containsAllergens: ['peanuts'],
          containsIntolerances: [],
          safe: false,
        })
      ),
    });

    const { getByText } = render(<Index />);

    await act(async () => {
      fireEvent.press(getByText('Test UPC'));
    });

    expect(getByText(/Contains allergens: peanuts/)).toBeTruthy();
  });

  it('displays intolerance warning when intolerances are found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          ingredients: ['lactose', 'water'],
          containsAllergens: [],
          containsIntolerances: ['lactose'],
          safe: true,
        })
      ),
    });

    const { getByText } = render(<Index />);

    await act(async () => {
      fireEvent.press(getByText('Test UPC'));
    });

    expect(getByText(/Contains intolerances: lactose/)).toBeTruthy();
  });

  it('navigates to /camera when Scan Barcode is pressed', () => {
    render(<Index />);
    const { getByText } = render(<Index />);

    fireEvent.press(getByText('Scan Barcode'));

    expect(mockPush).toHaveBeenCalledWith('/camera');
  });

  it('navigates to /profiles when Profiles / Settings is pressed', () => {
    const { getByText } = render(<Index />);

    fireEvent.press(getByText('Profiles / Settings'));

    expect(mockPush).toHaveBeenCalledWith('/profiles');
  });
});
