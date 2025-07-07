"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { Logo } from "@/components/ui/Logo";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";
import { useScrollBackground } from "@/hooks/useScrollBackground";

export default function HeaderNav() {
	const pathname = usePathname();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("login");
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const hasScrolled = useScrollBackground();

	const navItems = [
		{ label: "Best Picture", href: "/awards", match: "/awards" },
		{ label: "Rankings", href: "/rankings", match: "/rankings" },
		{ label: "Films", href: "/films", match: "/films" },
		{ label: "Lists", href: "/lists", match: "/lists" },
	];

	const handleLoginClick = () => {
		setAuthMode("login");
		setShowAuthModal(true);
	};

	const handleSignupClick = () => {
		setAuthMode("signup");
		setShowAuthModal(true);
	};

	return (
		<>
			<header className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
				hasScrolled 
					? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm dark:shadow-gray-800/50 border-b border-gray-200 dark:border-gray-700' 
					: 'bg-transparent'
			}`}>
				<div className="mx-auto px-6 py-4">
					<div className="flex items-center justify-between">
						{/* Logo */}
						<div className="flex items-center">
							<Logo size="sm" />
						</div>

						<div className="flex items-center gap-4">
							{/* Navigation */}
							<nav className="hidden md:block">
								<ul className="flex items-end gap-10 font-regular text-md font-unbounded">
									{navItems.map((item) => {
										const isActive =
											pathname === item.match ||
											(item.match === "/" && pathname === "");

										return (
											<li key={item.href} className="relative pb-2">
												<Link
													href={item.href}
													className={`relative ${
														isActive
															? "text-gold dark:text-gold"
															: "text-black dark:text-gray-300"
													} hover:text-gold dark:hover:text-gold transition-colors duration-200`}
												>
													{item.label}
												</Link>
											</li>
										);
									})}
									<li>
										<UserMenu onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
									</li>
								</ul>
							</nav>

							{/* Dark Mode Toggle */}
							{/* <div className="hidden md:block">
								<DarkModeToggle />
							</div> */}

							{/* Mobile Menu Button */}
							<button
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
								className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
								aria-label="Toggle mobile menu"
							>
								{mobileMenuOpen ? (
									<X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
								) : (
									<Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
								)}
							</button>
						</div>
					</div>

					{/* Mobile Menu */}
					{mobileMenuOpen && (
						<div className="md:hidden mt-4 pb-4 border-t border-gray-200 dark:border-gray-700">
							<div className="flex flex-col space-y-4 pt-4">
								{navItems.map((item) => {
									const isActive =
										pathname === item.match ||
										(item.match === "/" && pathname === "");

									return (
										<Link
											key={item.href}
											href={item.href}
											className={`font-unbounded text-lg ${
												isActive
													? "text-gold dark:text-gold"
													: "text-black dark:text-gray-300"
											} hover:text-gold dark:hover:text-gold transition-colors duration-200`}
											onClick={() => setMobileMenuOpen(false)}
										>
											{item.label}
										</Link>
									);
								})}
								<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
									<UserMenu onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
								</div>
								<DarkModeToggle />
							</div>
						</div>
					)}
				</div>
			</header>

			{/* Auth Modal */}
			<AuthModalManager
				isOpen={showAuthModal}
				onClose={() => setShowAuthModal(false)}
				initialMode={authMode}
				onAuthSuccess={() => {
					setShowAuthModal(false);
					// Handle successful auth (data migration is handled automatically)
				}}
			/>
		</>
	);
}
