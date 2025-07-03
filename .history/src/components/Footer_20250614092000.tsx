import React from "react";

export default function Footer() {
	return (
		<footer className="w-full border-t border-[#d6d6d3] text-center text-sm text-gray-500 py-6 mt-16">
			<p>
				&copy; {new Date().getFullYear()} My Oscar Awards · All rights
				reserved.
			</p>
		</footer>
	);
}

