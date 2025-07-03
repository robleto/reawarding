/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "sans-serif"], // ✅ Add Inter as default sans
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
