import typography from "@tailwindcss/typography";

const config = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-inter)", "sans-serif"],
				unbounded: ["var(--font-unbounded)", "sans-serif"],
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
				// Theme-flipping tones. The site is authored dark-first; these
				// scales resolve through CSS variables (globals.css) so `.light`
				// on <html> remaps the entire UI without per-class dark: variants.
				gray: {
					50: 'rgb(var(--tone-gray-50) / <alpha-value>)',
					100: 'rgb(var(--tone-gray-100) / <alpha-value>)',
					200: 'rgb(var(--tone-gray-200) / <alpha-value>)',
					300: 'rgb(var(--tone-gray-300) / <alpha-value>)',
					400: 'rgb(var(--tone-gray-400) / <alpha-value>)',
					500: 'rgb(var(--tone-gray-500) / <alpha-value>)',
					600: 'rgb(var(--tone-gray-600) / <alpha-value>)',
					700: 'rgb(var(--tone-gray-700) / <alpha-value>)',
					800: 'rgb(var(--tone-gray-800) / <alpha-value>)',
					900: 'rgb(var(--tone-gray-900) / <alpha-value>)',
					950: 'rgb(var(--tone-gray-950) / <alpha-value>)',
				},
				white: 'rgb(var(--tone-white) / <alpha-value>)',
				black: 'rgb(var(--tone-black) / <alpha-value>)',
				// Fixed values for the rare places that must not flip with the
				// theme (e.g. text over a movie poster).
				'always-white': '#ffffff',
				'always-black': '#000000',
				charcoal: {
					DEFAULT: 'rgb(var(--tone-charcoal-900) / <alpha-value>)',
					50: 'rgb(var(--tone-charcoal-50) / <alpha-value>)',
					100: 'rgb(var(--tone-charcoal-100) / <alpha-value>)',
					200: 'rgb(var(--tone-charcoal-200) / <alpha-value>)',
					300: 'rgb(var(--tone-charcoal-300) / <alpha-value>)',
					400: 'rgb(var(--tone-charcoal-400) / <alpha-value>)',
					500: 'rgb(var(--tone-charcoal-500) / <alpha-value>)',
					600: 'rgb(var(--tone-charcoal-600) / <alpha-value>)',
					700: 'rgb(var(--tone-charcoal-700) / <alpha-value>)',
					800: 'rgb(var(--tone-charcoal-800) / <alpha-value>)',
					900: 'rgb(var(--tone-charcoal-900) / <alpha-value>)',
				},
			},
		},
	},
	plugins: [typography],
};

export default config;
