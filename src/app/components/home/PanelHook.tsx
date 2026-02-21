"use client";

import { ReawardAnimation } from "./ReawardAnimation";
import { useHomePanelPosters } from "./useHomePanelPosters";

type PanelHookProps = {
  reducedMotion: boolean;
};

export default function PanelHook({ reducedMotion }: PanelHookProps) {
  const posters = useHomePanelPosters([
    {
      key: "kings-speech",
      title: "The King's Speech",
      year: 2010,
      fallbackUrl: "https://image.tmdb.org/t/p/w342/qKAfM7bm7bYKkMjpbVb3C2VHAkJ.jpg",
    },
    {
      key: "social-network",
      title: "The Social Network",
      year: 2010,
      fallbackUrl: "https://image.tmdb.org/t/p/w342/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg",
    },
    {
      key: "black-swan",
      title: "Black Swan",
      year: 2010,
      fallbackUrl: "https://image.tmdb.org/t/p/w342/4ajmCpjCaGkfT7ZPB5YI3OKYFoU.jpg",
    },
    {
      key: "inception",
      title: "Inception",
      year: 2010,
      fallbackUrl: "https://image.tmdb.org/t/p/w342/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
    },
  ]);

  return (
    <ReawardAnimation
      year="2010"
      panelId="panel-hook"
      headline="It's not just you."
      body="The 2010 Academy chose The King's Speech. Most of the internet disagreed. Your ReAward makes your position permanent."
      originalWinner={{
        title: "The King's Speech",
        posterUrl: posters.get("kings-speech") || "",
      }}
      newWinner={{
        title: "The Social Network",
        posterUrl: posters.get("social-network") || "",
      }}
      contenders={[
        { title: "Black Swan",  posterUrl: posters.get("black-swan") || "" },
        { title: "Inception",   posterUrl: posters.get("inception") || "" },
      ]}
      reducedMotion={reducedMotion}
    />
  );
}
