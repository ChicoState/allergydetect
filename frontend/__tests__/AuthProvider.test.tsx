import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { router } from 'expo-router';
import AuthProvider, { useAuthSession } from '@/providers/AuthProvider';

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('@/firebaseConfig', () => ({ auth: {} }));

// Define the mock inline so jest's hoisting doesn't cause TDZ issues
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  (onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => {
    cb(null);
    return jest.fn();
  });
});

describe('AuthProvider', () => {
  it('sets user and clears loading when auth state changes', () => {
    const mockUser = { uid: 'test-uid' };
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => {
      cb(mockUser);
      return jest.fn();
    });

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('starts with isLoading true until auth state resolves', () => {
    (onAuthStateChanged as jest.Mock).mockImplementation(() => jest.fn());

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('signIn calls signInWithEmailAndPassword with correct args', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'test@example.com',
      'password123'
    );
  });

  it('signIn redirects to / on success', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('signIn propagates firebase errors', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(
      new Error('auth/wrong-password')
    );

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signIn('bad@example.com', 'wrongpwd');
      })
    ).rejects.toThrow('auth/wrong-password');
  });

  it('signUp calls createUserWithEmailAndPassword and redirects', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await act(async () => {
      await result.current.signUp('new@example.com', 'newpassword');
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'new@example.com',
      'newpassword'
    );
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('signOut calls firebase signOut and redirects to /login', async () => {
    (signOut as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
