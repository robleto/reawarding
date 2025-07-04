# Navbar Component

A simple navigation bar component that adapts based on authentication state.

## Features

- **Auth State Aware**: Shows different content based on user authentication
- **Not Logged In**: Displays "Log In" and "Sign Up" buttons
- **Logged In**: Shows profile dropdown with:
  - User email
  - "My Lists" link
  - "Log Out" button
- **Profile Image**: Shows user avatar or placeholder
- **Responsive Design**: Works on all screen sizes

## Props

```typescript
interface NavbarProps {
  onLoginClick?: () => void;    // Callback when Log In button is clicked
  onSignupClick?: () => void;   // Callback when Sign Up button is clicked
}
```

## Usage

```tsx
import Navbar from '@/components/layout/Navbar';
import { useState } from 'react';

export default function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleLoginClick = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleSignupClick = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  return (
    <div>
      <Navbar 
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
      />
      {/* Your app content */}
    </div>
  );
}
```

## Integration with Auth System

The Navbar uses:
- `useUser()` from Supabase to get current user state
- `useSupabaseClient()` for sign out functionality
- Automatic state updates when user logs in/out

## Styling

Uses Tailwind CSS classes for:
- Clean, modern appearance
- Hover effects on interactive elements
- Proper spacing and typography
- Responsive design patterns

## Notes

- The main navigation is already implemented in `HeaderNav.tsx` with full navigation menu
- This `Navbar.tsx` component is a simplified version focusing only on auth state
- Both components can be used depending on your layout needs
- The dropdown automatically closes when clicking outside (handled by the auth system)
