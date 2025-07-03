/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		fontFamily: {
			sans: ["Inter", "sans-serif"],
		},
		extend: {},
	},
	variants: {
		extend: {},
	},
	plugins: [require("@tailwindcss/typography")],
	theme: {
		fontFamily: {
			sans: ["Inter", "sans-serif"],
		},
	},
};
