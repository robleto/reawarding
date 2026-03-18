"use client";

import Link from "next/link";
import ScreenState from "@/components/ui/ScreenState";

export default function ProfileFollowingPage() {
  return (
    <ScreenState
      title="Follow other members to see them here"
      message="The following feature is coming soon. When it launches, you'll be able to see the films and awards of people you follow."
      primaryAction={{ label: "Find people", href: "/films" }}
    />
  );
}
