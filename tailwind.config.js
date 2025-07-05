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
			backgroundImage: {
				'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
			},
			colors: {
				// Add custom Oscar-themed colors
				gold: {
					DEFAULT: '#D4AF37',
					50: '#F8F3E6',
					100: '#F1E6CC',
					200: '#E8D399',
					300: '#DFC066',
					400: '#D6AD33',
					500: '#D4AF37',
					600: '#B8952C',
					700: '#8F7322',
					800: '#665217',
					900: '#3D310E',
				},
				charcoal: {
					DEFAULT: '#2D2D2D',
					50: '#F5F5F5',
					100: '#E8E8E8',
					200: '#D1D1D1',
					300: '#B8B8B8',
					400: '#A0A0A0',
					500: '#878787',
					600: '#6E6E6E',
					700: '#555555',
					800: '#3C3C3C',
					900: '#2D2D2D',
				},
			},
		},
	},
	plugins: [typography],
};

export default config;
