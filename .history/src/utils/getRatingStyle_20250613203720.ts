export function getRatingStyle(rating: number) {
	switch (rating) {
		case 10:
			return { text: "#4c2c65", background: "#e5dbf3" }; // purple
		case 9:
			return { text: "#1a3448", background: "#d5e7f2" }; // blue
		case 8:
			return { text: "#1f3c30", background: "#dcebe3" }; // green
		case 7:
			return { text: "#5b3d00", background: "#f8e7ba" }; // yellow
		case 6:
			return { text: "#7b3f00", background: "#f4d8c7" }; // orange
		case 5:
			return { text: "#6a1f45", background: "#f5d9e8" }; // pink
		case 4:
			return { text: "#7b1818", background: "#f6d4d4" }; // red
		case 3:
			return { text: "#7b5c42", background: "#eee0d6" }; // beige
		case 2:
			return { text: "#474747", background: "#e2e2e2" }; // gray
		case 1:
			return { text: "#474747", background: "#f5f5f5" }; // light gray
		default:
			return { text: "#000", background: "#fff" };
	}
}
