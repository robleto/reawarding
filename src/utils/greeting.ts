/**
 * Generate a contextual greeting based on time of day and last login
 * @param lastLoginDate - User's last login timestamp (optional)
 * @param userName - User's display name or username
 * @returns Personalized greeting string
 */
export function getGreeting(lastLoginDate?: string | null, userName?: string): string {
  const now = new Date();
  const hour = now.getHours();
  const name = userName || "there";

  // If no last login, welcome new user
  if (!lastLoginDate) {
    return `Welcome, ${name}!`;
  }

  const lastLogin = new Date(lastLoginDate);
  const daysSinceLastLogin = Math.floor(
    (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Welcome back if it's been more than 1 day
  if (daysSinceLastLogin >= 1) {
    if (daysSinceLastLogin === 1) {
      return `Welcome back, ${name}!`;
    } else if (daysSinceLastLogin < 7) {
      return `Welcome back, ${name}!`;
    } else if (daysSinceLastLogin < 30) {
      return `Great to see you again, ${name}!`;
    } else {
      return `Welcome back, ${name}! It's been a while.`;
    }
  }

  // Time-based greeting if logged in same day
  if (hour >= 5 && hour < 12) {
    return `Good morning, ${name}!`;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon, ${name}!`;
  } else if (hour >= 17 && hour < 22) {
    return `Good evening, ${name}!`;
  } else {
    return `Hello, ${name}!`;
  }
}

/**
 * Get a contextual subheading based on days since last login
 */
export function getGreetingSubtext(daysSinceLastLogin?: number): string {
  if (!daysSinceLastLogin || daysSinceLastLogin === 0) {
    return "Continue rating movies and building your perfect Best Picture collection.";
  }
  
  if (daysSinceLastLogin === 1) {
    return "Continue rating movies and building your perfect Best Picture collection.";
  } else if (daysSinceLastLogin < 7) {
    return "Check out the latest additions to the catalog.";
  } else if (daysSinceLastLogin < 30) {
    return "We've added new movies since your last visit!";
  } else {
    return "Lots of new movies have been added. Ready to catch up?";
  }
}
