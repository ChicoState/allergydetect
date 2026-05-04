import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import Login from '@/app/login/index';
import { useAuthSession } from '@/providers/AuthProvider';

jest.mock('@/providers/AuthProvider', () => ({
  useAuthSession: jest.fn(),
}));

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthSession as jest.Mock).mockReturnValue({
    signIn: mockSignIn,
    signUp: mockSignUp,
  });
});

// Helper: the title <Text> and <Button> both render "Sign In", so use getByRole
// to target the button specifically.
function getSignInButton(getByRole: Function) {
  return getByRole('button', { name: 'Sign In' });
}

describe('Login screen', () => {
  it('renders Sign In title by default', () => {
    const { getAllByText } = render(<Login />);
    // Both the title Text and the Button render "Sign In"
    expect(getAllByText('Sign In').length).toBeGreaterThanOrEqual(1);
  });

  it('renders sign-in button by default', () => {
    const { getByRole } = render(<Login />);
    expect(getByRole('button', { name: 'Sign In' })).toBeTruthy();
  });

  it('toggles to Create Account mode when sign-up link is pressed', () => {
    const { getByText } = render(<Login />);

    fireEvent.press(getByText("Don't have an account? Sign up"));

    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Already have an account? Sign in')).toBeTruthy();
  });

  it('clears error message when toggling mode', async () => {
    mockSignIn.mockRejectedValue(new Error('Bad credentials'));
    const { getByRole, getByText, queryByText, getByPlaceholderText } = render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'Sign In' }));
    });

    expect(queryByText('Bad credentials')).toBeTruthy();

    fireEvent.press(getByText("Don't have an account? Sign up"));

    expect(queryByText('Bad credentials')).toBeNull();
  });

  it('calls signIn with entered email and password', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const { getByRole, getByPlaceholderText } = render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'secret123');

    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'Sign In' }));
    });

    expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'secret123');
  });

  it('calls signUp with entered credentials in sign-up mode', async () => {
    mockSignUp.mockResolvedValue(undefined);
    const { getByRole, getByText, getByPlaceholderText } = render(<Login />);

    fireEvent.press(getByText("Don't have an account? Sign up"));
    fireEvent.changeText(getByPlaceholderText('Email'), 'new@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'newpass456');

    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'Sign Up' }));
    });

    expect(mockSignUp).toHaveBeenCalledWith('new@test.com', 'newpass456');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('displays error message when signIn throws', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid email or password'));
    const { getByRole, getByText, getByPlaceholderText } = render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'fail@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');

    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'Sign In' }));
    });

    expect(getByText('Invalid email or password')).toBeTruthy();
  });

  it('displays fallback error when thrown error has no message', async () => {
    mockSignIn.mockRejectedValue({});
    const { getByRole, getByText, getByPlaceholderText } = render(<Login />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'fail@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');

    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'Sign In' }));
    });

    expect(getByText('Authentication failed')).toBeTruthy();
  });
});
