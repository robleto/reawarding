import { getRatingStyle } from "../utils/getRatingStyle";

export default function MovieCard({ title, imageUrl, rating }: Props) {
	const { text, bg } = getRatingStyle(rating);

	return (
		<div className="w-[156px] flex flex-col items-start">
			<div className="relative w-[147px] h-[83px] rounded-md overflow-hidden">
				<img
					src={imageUrl}
					alt={title}
					className="object-cover w-full h-full rounded-md"
				/>
				<div
					className="absolute px-2 py-1 text-sm font-semibold rounded-md bottom-1 right-1"
					style={{
						backgroundColor: bg,
						color: text,
					}}
				>
					{rating}
				</div>
			</div>
			<div className="mt-2 text-sm font-semibold text-black truncate">
				{title}
			</div>
		</div>
	);
}
