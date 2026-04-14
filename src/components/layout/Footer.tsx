import React from "react";
import Link from "next/link";

export default function Footer() {
	return (
		<footer className="w-full px-4 py-8 border-t bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
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
							<span className="text-sm font-bold tracking-widest text-gray-700 dark:text-white/80 uppercase" style={{ fontFamily: "var(--font-unbounded, 'Unbounded', sans-serif)" }}>
								ReAwarding
							</span>
							<span className="text-xs text-gray-400 dark:text-gray-400">
								Your canon. On record.
							</span>
						</div>
					</div>

					{/* Links + copyright */}
					<div className="flex flex-col items-start md:items-end gap-2">
						<div className="flex flex-wrap gap-4">
							<Link href="/help" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
								Help
							</Link>
							<Link href="/legal/privacy" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
								Privacy Policy
							</Link>
							<Link href="/legal/terms" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
								Terms of Service
							</Link>
							<Link href="/legal/data-deletion" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
								Data Deletion
							</Link>
						</div>
						<p className="text-xs text-gray-400 dark:text-gray-400">
							&copy; {new Date().getFullYear()} ReAwarding · All rights reserved.
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}

