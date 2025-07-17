"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { Logo } from "@/components/ui/Logo";
import { useScrollBackground } from "@/hooks/useScrollBackground";

export default function HeaderNav() {
	const pathname = usePathname();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("login");
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const navRefs = useRef<(HTMLLIElement | null)[]>([]);
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

	const getBubbleStyle = () => {
		if (hoveredIndex === null) return { opacity: 0 };
		
		const hoveredElement = navRefs.current[hoveredIndex];
		if (!hoveredElement) return { opacity: 0 };
		
		const rect = hoveredElement.getBoundingClientRect();
		const parentRect = hoveredElement.parentElement?.getBoundingClientRect();
		
		if (!parentRect) return { opacity: 0 };
		
		return {
			opacity: 1,
			left: rect.left - parentRect.left,
			width: rect.width,
			height: rect.height,
		};
	};

	return (
		<>
			<header className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-gray-400 dark:border-gray-700 transition-all duration-300 ${
				hasScrolled 
					? 'dark-background'
					: 'bg-transparent'
			}`}>
				<div className="relative z-10 flex items-center justify-between max-w-screen-xl px-6 py-3 mx-auto gap-x-6">
					{/* Logo & Title */}
					<div className="flex items-center flex-shrink-0">
						<Link href="/" className="flex items-center">
							<Logo size="sm" showText={false} />
						</Link>
					</div>

					{/* Navigation and Controls */}
					<div className="flex flex-1 items-center justify-between min-w-0">
						{/* Navigation */}
						<nav className="hidden md:block min-w-0">
							<div className="relative rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-md border border-gray-200/30 dark:border-gray-700/40 shadow-lg">
								{/* Bubble background */}
								<div 
									className="absolute top-0 rounded-lg bg-white/30 dark:bg-white/15 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-md transition-all duration-500 ease-out"
									style={{
										...getBubbleStyle(),
										transitionTimingFunction: `linear(
											0, 0.008 1.1%, 0.031 2.2%, 0.129 4.8%, 0.257 7.2%, 0.671 14.2%,
											0.789 16.5%, 0.881 18.6%, 0.957 20.7%, 1.019 22.9%, 1.063 25.1%,
											1.094 27.4%, 1.114 30.7%, 1.112 34.5%, 1.018 49.9%, 0.99 59.1%, 1
										)`
									}}
								/>
								<ul className="flex items-center font-medium text-sm font-inter relative z-10">
									{navItems.map((item, index) => {
										const isActive =
											pathname === item.match ||
											(item.match === "/" && pathname === "");

										return (
											<li 
												key={item.href}
												ref={(el) => { navRefs.current[index] = el; }}
												onMouseEnter={() => setHoveredIndex(index)}
												onMouseLeave={() => setHoveredIndex(null)}
											>
												<Link
													href={item.href}
													className={`block px-4 py-2 relative transition-colors duration-200 rounded-lg text-center ${
														isActive
															? "text-gold dark:text-gold"
															: "text-black dark:text-gray-300"
													} hover:text-gold dark:hover:text-gold`}
												>
													{item.label}
												</Link>
											</li>
										);
									})}
								</ul>
							</div>
						</nav>

						{/* Controls: UserMenu */}
						<div className="flex items-center gap-4 flex-shrink-0">
							<UserMenu onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
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
				</div>

				{/* Mobile Menu */}
				{mobileMenuOpen && (
					<div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-800/50 transition-colors duration-300">
						<nav className="px-6 py-4">
							<ul className="space-y-3">
								{navItems.map((item) => {
									const isActive =
										pathname === item.match ||
										(item.match === "/" && pathname === "");

									return (
										<li key={item.href}>
											<Link
												href={item.href}
												className={`block py-2 px-3 rounded-md font-medium transition-colors ${
													isActive
														? "text-gold dark:text-gold bg-yellow-50 dark:bg-gold/10"
														: "text-gray-700 dark:text-gray-300 hover:text-gold dark:hover:text-gold hover:bg-gray-50 dark:hover:bg-gray-800"
												}`}
												onClick={() => setMobileMenuOpen(false)}
											>
												{item.label}
											</Link>
										</li>
									);
								})}
								<li className="pt-2 border-t border-gray-200 dark:border-gray-700">
									<UserMenu onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
								</li>
							</ul>
						</nav>
					</div>
				)}
			</header>

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
