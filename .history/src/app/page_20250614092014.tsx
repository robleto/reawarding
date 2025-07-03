import React from "react";
import HeaderNav from "@/components/HeaderNav";
import YearSection from "@/components/YearSection";
import Footer from "@/components/Footer";
import oscarData from "@/data/Oscars.json";

export default function Page() {
	return (
		<div className="flex flex-col min-h-screen max-w-[1440px] mx-auto px-6">
			<HeaderNav />

			{/* Optional timeline marker image */}
			<div className="w-[25px] h-[12.5px] bg-[url('https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-06-13/BKANmvjOQ8.png')] bg-cover bg-no-repeat mt-3 ml-auto" />

			{/* Optional top border under nav */}
			<div className="w-full border-t border-[#d6d6d3] mt-2" />

			{/* Main content */}
			<main className="flex-1 mt-8 space-y-24">
				{oscarData.years.map((yearData) => (
					<YearSection
						key={yearData.year}
						year={yearData.year}
						movies={yearData.nominees}
						winner={yearData.winner}
					/>
				))}
			</main>

			<Footer />
		</div>
	);
}
