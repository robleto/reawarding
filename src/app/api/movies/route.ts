import { NextResponse } from 'next/server';

export async function GET() {
  const movies = [
    {
      id: "1",
      title: "Movie Title",
      thumb_url: "https://example.com/movie.jpg",
      ranking: 9,
      release_year: "2025"
    },
    {
      id: "2",
      title: "Another Movie",
      thumb_url: "https://example.com/movie2.jpg",
      ranking: 8,
      release_year: "2025"
    }
  ];

  return NextResponse.json(movies);
}
