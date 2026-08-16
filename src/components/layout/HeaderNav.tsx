"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, LineChart, List, Menu, Plus, Search, Trophy, X } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import NavSearch from "@/components/layout/NavSearch";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { Logo } from "@/components/ui/Logo";
import { useScrollBackground } from "@/hooks/useScrollBackground";
import AddMovieByTmdbModal from "@/components/movie/AddMovieByTmdbModal";
import { useAuthState } from "@/hooks/useAuthState";

export default function HeaderNav() {
	const pathname = usePathname();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("login");
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
	const [showAddMovieModal, setShowAddMovieModal] = useState(false);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const navRefs = useRef<(HTMLLIElement | null)[]>([]);
	const hasScrolled = useScrollBackground();
	const { user } = useAuthState();

	const navItems = user
		? [
				{ label: "Films", href: "/films", match: "/films", icon: Clapperboard },
				{ label: "Rankings", href: "/rankings", match: "/rankings", icon: LineChart },
				{ label: "Lists", href: "/lists", match: "/lists", icon: List },
		  ]
		: [];

	// Desktop-only: Awards is deliberately absent from the mobile bottom tab
	// bar (see MobileTabBar.tsx — Home absorbed the year timeline /awards
	// used to own, so a redundant tab was retired there). On desktop it's
	// still worth naming explicitly as the first item, even though it points
	// at the same surface as the logo/Home link.
	const desktopNavItems = user
		? [{ label: "Awards", href: "/awards", match: "/awards", icon: Trophy }, ...navItems]
		: [];

	const handleLoginClick = () => {
		setMobileMenuOpen(false);
		setAuthMode("login");
		setShowAuthModal(true);
	};

	const handleSignupClick = () => {
		setMobileMenuOpen(false);
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
			<header className={`fixed top-0 left-0 right-0 z-50 w-full pt-[env(safe-area-inset-top)] border-b border-gray-700 transition-all duration-300 ${
				hasScrolled 
					? 'dark-background'
					: 'bg-transparent'
			}`}> 
				<div className="relative z-10 flex items-center justify-between max-w-screen-xl px-4 sm:px-6 py-3 mx-auto gap-x-2 sm:gap-x-6">
				{/* Logo & Title */}
				<div className="flex items-center flex-shrink-0 gap-1 sm:gap-2">
					<Link href="/" className="flex items-center min-h-[44px]" aria-label="Reawarding home">
						<Logo
							size="sm"
							showText={false}
							imageClassName="object-contain w-[150px] h-[60px] sm:w-[180px] sm:h-[72px]"
						/>
					</Link>
					<span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider text-gray-400 bg-charcoal-900/60 border border-gray-700/60 rounded uppercase whitespace-nowrap">
						Beta
					</span>
				</div>					{/* Navigation and Controls */}
					<div className="flex flex-1 items-center justify-between min-w-0">
						{/* Navigation */}
						<nav className="hidden md:block min-w-0">
							<div className="relative rounded-xl bg-black/20 backdrop-blur-md border border-gray-700/40 shadow-lg">
								{/* Bubble background */}
								<div 
									className="nav-bubble absolute top-0 rounded-lg backdrop-blur-xl transition-all duration-500 ease-out"
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
									{desktopNavItems.map((item, index) => {
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
															? "text-gold"
															: "text-gray-300"
													} hover:text-gold`}
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
						<div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 ml-auto">
							{user && (
								<button
									onClick={() => setShowAddMovieModal(true)}
									className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
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
								onClick={() => { setMobileSearchOpen(!mobileSearchOpen); if (!mobileSearchOpen) { setMobileMenuOpen(false); } }}
								className={`md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md transition-colors ${
									mobileSearchOpen ? "text-gold bg-gray-800" : "text-gray-300 hover:bg-gray-800"
								}`}
								aria-label="Search films"
								aria-expanded={mobileSearchOpen}
							>
								<Search className="w-5 h-5" />
							</button>
							{/* Mobile Menu Button */}
							<button
								onClick={() => { setMobileMenuOpen(!mobileMenuOpen); if (!mobileMenuOpen) { setMobileSearchOpen(false); } }}
								className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-3 rounded-md hover:bg-gray-800 transition-colors ml-auto"
								aria-label="Toggle mobile menu"
							>
								{mobileMenuOpen ? (
									<X className="w-6 h-6 text-gray-300" />
								) : (
									<Menu className="w-6 h-6 text-gray-300" />
								)}
							</button>
						</div>
					</div>
				</div>

				{/* Mobile Search Panel — search is the primary way to find a film
				    on mobile (the Films catalog is secondary; see decision log). */}
				{mobileSearchOpen && (
					<div className="md:hidden bg-charcoal-900 border-t border-gray-700 shadow-gray-800/50 transition-colors duration-300">
						<div className="px-6 py-4">
							<NavSearch
								variant="panel"
								autoFocus
								onNavigate={() => setMobileSearchOpen(false)}
							/>
						</div>
					</div>
				)}

				{/* Mobile Menu */}
				{mobileMenuOpen && (
					<div className="md:hidden bg-charcoal-900 border-t border-gray-700 shadow-gray-800/50 transition-colors duration-300">
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
														? "text-gold bg-gold/10"
														: "text-gray-300 hover:text-gold hover:bg-gray-800"
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
								{user && (
									<li>
										<button
											onClick={() => { setMobileMenuOpen(false); setShowAddMovieModal(true); }}
											className="flex items-center w-full gap-2 py-2 px-3 rounded-md font-medium text-left text-gray-300 hover:text-gold hover:bg-gray-800 transition-colors"
										>
											<Plus className="w-4 h-4" />
											<span>Add a film</span>
										</button>
									</li>
								)}
							</ul>
							<div className={navItems.length > 0 ? "mt-4 border-t border-gray-700 pt-3" : undefined}>
								<UserMenu
									variant="inline"
									onLoginClick={handleLoginClick}
									onSignupClick={handleSignupClick}
									onNavigate={() => setMobileMenuOpen(false)}
								/>
							</div>
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
