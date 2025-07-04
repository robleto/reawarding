"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { Logo } from "@/components/ui/Logo";

export default function HeaderNav() {
	const pathname = usePathname();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("login");
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const navItems = [
		{ label: "Best Picture", href: "/awards", match: "/awards" },
		{ label: "Rankings", href: "/rankings", match: "/rankings" },
		{ label: "Films", href: "/films", match: "/films" },
		{ label: "Nominees", href: "/nominees", match: "/nominees" },
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
			<header className="w-full bg-white border-b border-gray-200 shadow-sm">
				<div className="relative z-10 flex items-end justify-between max-w-screen-xl px-6 py-3 mx-auto">
					{/* Logo & Title */}
					<Link href="/" className="flex items-center">
						<Logo size="sm" showText={false} />
						<h1 className="ml-2 text-lg uppercase font-bold font-['Unbounded'] text-[#1c3728] font-inter tracking-widest">
							OscarWorthy
						</h1>
					</Link>

					{/* Navigation */}
					<nav className="hidden md:block">
						<ul className="flex items-end gap-10 font-semibold text-md font-inter">
							{navItems.map((item) => {
								const isActive =
									pathname === item.match ||
									(item.match === "/" && pathname === "");

								return (
									<li key={item.href} className="relative pb-2">
										<a
											href={item.href}
											className={`relative ${
												isActive
													? "text-[#ba7a00] after:content-[''] after:absolute after:top-[calc(100%+12px)] after:left-1/2 after:-translate-x-1/2 after:border-l-[12px] after:border-r-[12px] after:border-b-[12px] after:border-l-transparent after:border-r-transparent after:border-b-[#ba7a00] after:border-t-0"
													: "text-black"
											} hover:underline`}
										>
											{item.label}
										</a>
									</li>
								);
							})}
							<li>
								<UserMenu onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
							</li>
						</ul>
					</nav>

					{/* Mobile Menu Button */}
					<button
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
						aria-label="Toggle mobile menu"
					>
						{mobileMenuOpen ? (
							<X className="w-6 h-6 text-gray-700" />
						) : (
							<Menu className="w-6 h-6 text-gray-700" />
						)}
					</button>
				</div>

				{/* Mobile Menu */}
				{mobileMenuOpen && (
					<div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
						<nav className="px-6 py-4">
							<ul className="space-y-3">
								{navItems.map((item) => {
									const isActive =
										pathname === item.match ||
										(item.match === "/" && pathname === "");

									return (
										<li key={item.href}>
											<a
												href={item.href}
												className={`block py-2 px-3 rounded-md font-medium transition-colors ${
													isActive
														? "text-[#ba7a00] bg-yellow-50"
														: "text-gray-700 hover:text-[#ba7a00] hover:bg-gray-50"
												}`}
												onClick={() => setMobileMenuOpen(false)}
											>
												{item.label}
											</a>
										</li>
									);
								})}
								<li className="pt-2 border-t border-gray-200">
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
