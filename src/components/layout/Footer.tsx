import React from "react";
import Link from "next/link";

export default function Footer() {
	return (
    <footer className="w-full px-4 py-6 border-t bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
			<div className="max-w-7xl mx-auto">
				<div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						&copy; {new Date().getFullYear()} Reawarding · All rights reserved.
					</p>
					<div className="flex flex-wrap justify-center md:justify-end gap-4 md:gap-6">
						<Link
							href="/legal/privacy"
							className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
						>
							Privacy Policy
						</Link>
						<Link
							href="/legal/terms"
							className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
						>
							Terms of Service
						</Link>
						<Link
							href="/legal/data-deletion"
							className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
						>
							Data Deletion
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}

