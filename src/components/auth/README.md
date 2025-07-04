# Authentication Modal Components

This directory contains the authentication modal components for the OscarWorthy app.

## Components

### LoginModal
A modal for user login with:
- Email/password authentication
- Google, Apple, and Facebook OAuth authentication
- Password visibility toggle
- Error handling and loading states
- Success callback and toast notifications
- Auto-redirect to `/rankings` on successful login

### SignupModal
A modal for user registration with:
- Email/password signup
- Google, Apple, and Facebook OAuth signup
- Password confirmation validation
- Email confirmation flow
- Error handling and loading states
- Success callback and toast notifications
- Auto-redirect to `/rankings` on successful signup

### AuthModalManager
A wrapper component that manages both LoginModal and SignupModal:
- Handles switching between login and signup modes
- Maintains consistent interface
- Manages modal state and callbacks

## Usage

### Basic Usage

```tsx
import { useState } from 'react';
import { AuthModalManager } from '@/components/auth';

function MyComponent() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowAuthModal(true)}>
        Sign In
      </button>
      
      <AuthModalManager
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login" // or "signup"
        onAuthSuccess={(user) => {
          console.log('User authenticated:', user);
          // Handle successful authentication
        }}
      />
    </>
  );
}
```

### Individual Modal Usage

```tsx
import { LoginModal, SignupModal } from '@/components/auth';

// Use LoginModal directly
<LoginModal
  isOpen={showLogin}
  onClose={() => setShowLogin(false)}
  onAuthSuccess={(user) => console.log('Logged in:', user)}
  onSwitchToSignup={() => setCurrentMode('signup')}
/>

// Use SignupModal directly
<SignupModal
  isOpen={showSignup}
  onClose={() => setShowSignup(false)}
  onAuthSuccess={(user) => console.log('Signed up:', user)}
  onSwitchToLogin={() => setCurrentMode('login')}
/>
```

## Features

- **Supabase Integration**: Uses Supabase Auth for authentication
- **OAuth Support**: Google, Apple, and Facebook authentication with proper redirects
- **Guest Data Migration**: Automatically migrates guest data to user account
- **Toast Notifications**: Success/error feedback via global toast system
- **Form Validation**: Client-side validation for passwords and email
- **Responsive Design**: Mobile-friendly modal dialogs
- **Loading States**: Visual feedback during authentication
- **Error Handling**: Clear error messages for failed authentication

## Dependencies

- `@supabase/auth-helpers-react`: For Supabase authentication
- `@supabase/auth-helpers-nextjs`: For Next.js integration
- `lucide-react`: For icons
- `next/navigation`: For programmatic navigation
- Custom hooks and utilities for guest data management
