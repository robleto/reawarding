"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, LineChart, List, Menu, Plus, Trophy, X } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import NavSearch from "@/components/layout/NavSearch";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { Logo } from "@/components/ui/Logo";
import UserAvatar from "@/components/ui/UserAvatar";
import { useScrollBackground } from "@/hooks/useScrollBackground";
import { useEnsureProfile } from "@/hooks/useEnsureProfile";
import AddMovieByTmdbModal from "@/components/movie/AddMovieByTmdbModal";
import { useAuthState } from "@/hooks/useAuthState";

export default function HeaderNav() {
	const pathname = usePathname();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("login");
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileUserOpen, setMobileUserOpen] = useState(false);
	const [showAddMovieModal, setShowAddMovieModal] = useState(false);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const navRefs = useRef<(HTMLLIElement | null)[]>([]);
	const hasScrolled = useScrollBackground();
	const { user } = useAuthState();
	const { profile } = useEnsureProfile(user);
	const displayName = profile?.preferred_name || profile?.full_name || profile?.username || user?.email;
	const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

	const navItems = user
		? [
				{ label: "Films", href: "/films", match: "/films", icon: Clapperboard },
				{ label: "Rankings", href: "/rankings", match: "/rankings", icon: LineChart },
				{ label: "Awards", href: "/awards", match: "/awards", icon: Trophy },
				{ label: "Lists", href: "/lists", match: "/lists", icon: List },
		  ]
		: [];

	const handleLoginClick = () => {
		setMobileMenuOpen(false);
		setMobileUserOpen(false);
		setAuthMode("login");
		setShowAuthModal(true);
	};

	const handleSignupClick = () => {
		setMobileMenuOpen(false);
		setMobileUserOpen(false);
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
					? 'light-background dark-background'
					: 'bg-transparent'
			}`}> 
				<div className="relative z-10 flex items-center justify-between max-w-screen-xl px-6 py-3 mx-auto gap-x-6">
				{/* Logo & Title */}
				<div className="flex items-center flex-shrink-0 gap-2">
					<Link href="/" className="flex items-center">
						<Logo size="sm" showText={false} />
					</Link>
					<span className="ml-2 px-2 py-0.5 text-[10px] font-bold tracking-wider text-yellow-900 dark:text-yellow-200 bg-yellow-400/90 dark:bg-yellow-500/30 border border-yellow-600/50 dark:border-yellow-400/40 rounded uppercase">
						Beta
					</span>
				</div>					{/* Navigation and Controls */}
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
										const Icon = item.icon;
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
													<span className="inline-flex items-center gap-1.5">
														<Icon className="w-3.5 h-3.5" />
														<span>{item.label}</span>
													</span>
												</Link>
											</li>
										);
									})}
								</ul>
							</div>
						</nav>

						{/* Controls: Add + Search + UserMenu */}
						<div className="flex items-center gap-3 flex-shrink-0 ml-auto">
							{user && (
								<button
									onClick={() => setShowAddMovieModal(true)}
									className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									aria-label="Add movie by TMDB ID"
									title="Add movie by TMDB ID"
								>
									<Plus className="w-4 h-4" />
								</button>
							)}
							<div className="hidden md:block">
								<NavSearch />
							</div>
							<div className="hidden md:block">
								<UserMenu onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
							</div>

							<button
								onClick={() => setShowAddMovieModal(true)}
								className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
								aria-label="Add movie by TMDB ID"
								title="Add movie by TMDB ID"
							>
								<Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
							</button>
							{user && (
								<button
									className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									aria-label="Open user menu"
									onClick={() => { setMobileUserOpen(!mobileUserOpen); if (!mobileUserOpen) setMobileMenuOpen(false); }}
								>
									<UserAvatar
										imageUrl={avatarUrl}
										name={displayName}
										username={profile?.username}
										size={28}
									/>
								</button>
							)}
							{/* Mobile Menu Button */}
							<button
								onClick={() => { setMobileMenuOpen(!mobileMenuOpen); if (!mobileMenuOpen) setMobileUserOpen(false); }}
								className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-auto"
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
									const Icon = item.icon;
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
												<span className="inline-flex items-center gap-2">
													<Icon className="w-4 h-4" />
													<span>{item.label}</span>
												</span>
											</Link>
										</li>
									);
								})}

							</ul>
							{!user && (
								<div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
									<UserMenu
										variant="inline"
										onLoginClick={handleLoginClick}
										onSignupClick={handleSignupClick}
									/>
								</div>
							)}
						</nav>
					</div>
				)}

				{/* Mobile User Panel */}
				{mobileUserOpen && (
					<div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-800/50 transition-colors duration-300">
						<nav className="px-6 py-4">
							<ul className="space-y-3">
								<li>
									<UserMenu variant="inline" onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
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
			<AddMovieByTmdbModal
				isOpen={showAddMovieModal}
				onClose={() => setShowAddMovieModal(false)}
			/>
		</>
	);
}
