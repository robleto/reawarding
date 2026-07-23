import React from "react";
import Link from "next/link";

// Dark-only footer per the project's dark-only canvas. Previously used
// dual-mode bg-gray-50 / bg-gray-900 which produced an SSR flash
// to white when the inline dark-mode script hadn't run yet (or paint
// raced ahead of the `dark` class landing on <html>). Simplified to a
// single canonical surface using bg-gray-950 to match the body canvas.

export default function Footer() {
	return (
		<footer className="w-full px-4 py-8 border-t bg-gray-950 border-gray-800">
			<div className="max-w-7xl mx-auto">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
					{/* Brand zone */}
					<div className="flex items-center gap-3">
						<img
							src="/reawarding-logomark.svg"
							alt=""
							aria-hidden="true"
							width={28}
							height={28}
							className="opacity-80"
						/>
						<div className="flex flex-col leading-tight">
							<span className="text-sm font-bold tracking-widest text-white/80 uppercase" style={{ fontFamily: "var(--font-unbounded, 'Unbounded', sans-serif)" }}>
								Reawarding
							</span>
							<span className="text-xs text-gray-400">
								Your canon. On record.
							</span>
						</div>
					</div>

					{/* Links + copyright */}
					<div className="flex flex-col items-start md:items-end gap-2">
						<div className="flex flex-wrap gap-4">
							<Link href="/help" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
								Help
							</Link>
							<Link href="/guides" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
								Guides
							</Link>
							<Link href="/legal/privacy" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
								Privacy Policy
							</Link>
							<Link href="/legal/terms" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
								Terms of Service
							</Link>
							<Link href="/legal/data-deletion" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
								Data Deletion
							</Link>
						</div>
						<p className="text-xs text-gray-400">
							&copy; {new Date().getFullYear()} Reawarding · All rights reserved.
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}
