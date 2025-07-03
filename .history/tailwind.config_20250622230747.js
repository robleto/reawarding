import typography from "@tailwindcss/typography";

const config = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "sans-serif"], // ✅ Add Inter as default sans

				unbounded: ['"Unbounded"', "sans-serif"],
			},
		},
	},
	plugins: [typography],
};

export default config;
