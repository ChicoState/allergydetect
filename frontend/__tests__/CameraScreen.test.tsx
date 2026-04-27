import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import CameraScreen from '@/app/camera';
import { useAuthSession } from '@/providers/AuthProvider';
import { useCameraPermissions } from 'expo-camera';

// Capture the onBarcodeScanned callback so tests can trigger it directly
let capturedOnBarcodeScanned: ((result: { data: string; type: string }) => void) | undefined;

jest.mock('expo-camera', () => {
  const RealReact = require('react');
  const { View } = require('react-native');
  return {
    CameraView: (props: any) => {
      capturedOnBarcodeScanned = props.onBarcodeScanned;
      return RealReact.createElement(View, { testID: 'camera-view' });
    },
    useCameraPermissions: jest.fn(),
  };
});

jest.mock('@/providers/AuthProvider', () => ({
  useAuthSession: jest.fn(),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ back: mockBack })),
}));

const mockUser = { uid: 'test-uid-123' };

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnBarcodeScanned = undefined;
  (useAuthSession as jest.Mock).mockReturnValue({ user: mockUser });
  mockFetch.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({
      ingredients: ['water'],
      containsAllergens: [],
      containsIntolerances: [],
      safe: true,
    }),
  });
});

describe('Camera screen', () => {
  it('shows loading text when camera permission is null', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([null, jest.fn()]);

    const { getByText } = render(<CameraScreen />);

    expect(getByText('Loading permissions...')).toBeTruthy();
  });

  it('shows permission request UI when camera permission is not granted', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: false }, jest.fn()]);

    const { getByText } = render(<CameraScreen />);

    expect(getByText('Camera permission required.')).toBeTruthy();
    expect(getByText('Grant permission')).toBeTruthy();
  });

  it('calls requestPermission when Grant permission is pressed', () => {
    const mockRequestPermission = jest.fn();
    (useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false },
      mockRequestPermission,
    ]);

    const { getByText } = render(<CameraScreen />);
    fireEvent.press(getByText('Grant permission'));

    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('shows the camera view when permission is granted', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);

    const { getByTestId } = render(<CameraScreen />);

    expect(getByTestId('camera-view')).toBeTruthy();
  });

  it('fetches ingredients from the API when a barcode is scanned', async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    render(<CameraScreen />);

    await act(async () => {
      capturedOnBarcodeScanned?.({ data: '012345678905', type: 'upc_a' });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/ingredients/012345678905/test-uid-123'
    );
  });

  it('displays SAFE after scanning a product with no allergens', async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    const { getByText } = render(<CameraScreen />);

    await act(async () => {
      capturedOnBarcodeScanned?.({ data: '012345678905', type: 'upc_a' });
    });

    expect(getByText(/SAFE/)).toBeTruthy();
  });

  it('displays allergen warning after scanning a product with allergens', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        ingredients: ['peanut butter'],
        containsAllergens: ['peanuts'],
        containsIntolerances: [],
        safe: false,
      }),
    });

    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    const { getByText } = render(<CameraScreen />);

    await act(async () => {
      capturedOnBarcodeScanned?.({ data: '012345678905', type: 'upc_a' });
    });

    expect(getByText(/Contains allergens: peanuts/)).toBeTruthy();
  });

  it('displays intolerance warning when intolerances are found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        ingredients: ['milk'],
        containsAllergens: [],
        containsIntolerances: ['lactose'],
        safe: true,
      }),
    });

    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    const { getByText } = render(<CameraScreen />);

    await act(async () => {
      capturedOnBarcodeScanned?.({ data: '012345678905', type: 'upc_a' });
    });

    expect(getByText(/Contains intolerances: lactose/)).toBeTruthy();
  });

  it('does not fetch when there is no logged-in user', async () => {
    (useAuthSession as jest.Mock).mockReturnValue({ user: null });
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    render(<CameraScreen />);

    await act(async () => {
      capturedOnBarcodeScanned?.({ data: '012345678905', type: 'upc_a' });
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resets state and re-enables scanning when Scan Again is pressed', async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    const { getByText, queryByText } = render(<CameraScreen />);

    await act(async () => {
      capturedOnBarcodeScanned?.({ data: '012345678905', type: 'upc_a' });
    });

    expect(getByText(/SAFE/)).toBeTruthy();

    fireEvent.press(getByText('Scan Again'));

    expect(queryByText(/SAFE/)).toBeNull();
  });

  it('navigates back when Back is pressed', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    const { getByText } = render(<CameraScreen />);

    fireEvent.press(getByText('Back'));

    expect(mockBack).toHaveBeenCalled();
  });
});
