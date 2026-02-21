"use client";

import { ReawardAnimation } from "./ReawardAnimation";
import { useHomePanelPosters } from "./useHomePanelPosters";

type PanelPremiseProps = {
  reducedMotion: boolean;
};

export default function PanelPremise({ reducedMotion }: PanelPremiseProps) {
  const posters = useHomePanelPosters([
    {
      key: "forrest-gump",
      title: "Forrest Gump",
      year: 1994,
      fallbackUrl: "https://image.tmdb.org/t/p/w342/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
    },
    {
      key: "shawshank",
      title: "The Shawshank Redemption",
      year: 1994,
      fallbackUrl: "https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    },
    {
      key: "pulp-fiction",
      title: "Pulp Fiction",
      year: 1994,
      fallbackUrl: "https://image.tmdb.org/t/p/w342/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    },
    {
      key: "lion-king",
      title: "The Lion King",
      year: 1994,
      fallbackUrl: "https://image.tmdb.org/t/p/w342/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg",
    },
  ]);

  return (
		<ReawardAnimation
			year="1994"
			originalWinner={{
				title: "Forrest Gump",
				posterUrl: posters.get("forrest-gump") || "",
			}}
			newWinner={{
				title: "The Shawshank Redemption",
				posterUrl: posters.get("shawshank") || "",
			}}
			contenders={[
				{
					title: "Pulp Fiction",
					posterUrl: posters.get("pulp-fiction") || "",
				},
				{
					title: "The Lion King",
					posterUrl: posters.get("lion-king") || "",
				},
			]}
			reducedMotion={reducedMotion}
		/>
  );
}
