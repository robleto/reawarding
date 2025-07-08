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

			<header className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${
				hasScrolled 
					? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm dark:shadow-gray-800/50' 
					: 'bg-transparent'
			}`}>
				<div className="relative z-10 flex items-end justify-between max-w-screen-xl px-6 py-3 mx-auto">
					{/* Logo & Title */}
					<Link href="/" className="flex items-center">
						<Logo size="sm" showText={false} />
						<h1 className="ml-2 text-lg uppercase font-bold font-['Unbounded'] text-[#1c3728] dark:text-gold font-inter tracking-widest transition-colors duration-300">
							OscarWorthy
						</h1>
					</Link>

					<div className="flex items-center gap-4">
						{/* Navigation */}
						<nav className="hidden md:block">
							<ul className="flex items-end gap-10 font-semibold text-md font-inter">
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
														? "text-gold dark:text-gold after:content-[''] after:absolute after:top-[calc(100%+12px)] after:left-1/2 after:-translate-x-1/2 after:border-l-[12px] after:border-r-[12px] after:border-b-[12px] after:border-l-transparent after:border-r-transparent after:border-b-gold after:border-t-0"
														: "text-black dark:text-gray-300"
												} hover:text-gold dark:hover:text-gold transition-colors duration-200`}
											>
												{item.label}
											</Link>
										</li>
									);
								})}
							</ul>
						</nav>

					{/* Dark Mode Toggle */}
					<div className="hidden md:block">
						<DarkModeToggle />
					</div>

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
								<li className="pt-2">
									<DarkModeToggle />
								</li>
							</ul>
						</nav>
					</div>
				)}
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
