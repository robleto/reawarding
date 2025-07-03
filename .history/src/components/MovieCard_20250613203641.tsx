import React from "react";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface MovieCardProps {
	title: string;
	imageUrl: string;
	rating: number;
}

export default function MovieCard({ title, imageUrl, rating }: MovieCardProps) {
	const { text, background } = getRatingStyle(rating);

	return (
		<article className="flex w-[156.4px] h-[128.8px] flex-col items-start flex-nowrap relative">
			<div className="w-[156.6px] h-[87.6px] shrink-0 relative">
				<div
					className="w-[147.2px] h-[82.8px] bg-cover bg-no-repeat rounded-[6.9px] absolute top-0 left-0"
					style={{ backgroundImage: `url(${imageUrl})` }}
				/>
				<div className="w-[28px] h-[28px] text-[0px] rounded-[6.222px] absolute top-[59.6px] left-[128.6px]">
					<span
						className="block h-[19px] font-['Inter'] text-[15.555556px] font-semibold leading-[18.826px] relative text-left whitespace-nowrap mt-[5.444px] ml-[9.333px]"
						style={{ color: text }}
					>
						{rating}
					</span>
					<div
						className="w-[28px] h-[28px] rounded-[6.222px] absolute top-0 left-0"
						style={{ backgroundColor: background }}
					/>
				</div>
			</div>
			<h4 className="flex w-[156.4px] h-[17px] justify-start items-start font-['Inter'] text-[14px] font-semibold leading-[16.943px] text-[#000] whitespace-nowrap">
				{title}
			</h4>
		</article>
	);
}
