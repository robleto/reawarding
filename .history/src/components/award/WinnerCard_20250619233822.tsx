<article className="text-center">
	<div className="inline-flex items-center justify-center gap-2">
		<img src="/icons/trophy.svg" alt="Trophy" className="w-6 h-6" />
		<h3 className="text-2xl font-bold text-[#cb8601]">Winner</h3>
	</div>

	<div className="mt-4 mx-auto max-w-[240px]">
		<div className="rounded-xl shadow-lg overflow-hidden aspect-[2/3]">
			<img
				src={imageUrl}
				alt={title}
				className="object-contain w-full h-full"
			/>
			<div className="absolute bottom-2 right-2 bg-white/80 rounded-md px-2 py-1 text-sm font-semibold text-[#1a3448]">
				{rating}
			</div>
		</div>
		<h4 className="mt-3 text-xl font-semibold text-[#1a3448]">{title}</h4>
	</div>
</article>;
