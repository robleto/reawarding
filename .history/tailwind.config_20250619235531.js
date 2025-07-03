import typography from "@tailwindcss/typography";

export default {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "sans-serif"], // ✅ Add Inter as default sans
			},
		},
	},
	plugins: [typography],
};
