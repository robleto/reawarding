import React from "react";

export default function Footer() {
	return (
    <footer className="w-full px-4 py-6 border-t bg-gray-50 text-center text-sm text-gray-500">
			<p>
				&copy; {new Date().getFullYear()} Oscarworthy · All rights
				reserved.
			</p>
		</footer>
	);
}

