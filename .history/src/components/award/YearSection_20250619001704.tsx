import React from 'react';
import MovieCard from './MovieCard';
import WinnerCard from './WinnerCard';

interface Movie {
  id: string;
  title: string;
  thumb_url: string;
  ranking: number;
}

interface YearSectionProps {
  year: string;
  movies: Movie[];
  winner: Movie;
}

export default function YearSection({ year, movies, winner }: YearSectionProps) {
  return (
    <section className="w-full max-w-screen-xl mx-auto px-8 py-12">
      <div className="relative flex items-start gap-4 min-h-[600px]">
        <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
          <h2 className="text-3xl font-bold text-[#1c3728] font-['Inter'] mt-2">{year}</h2>
          <div className="w-5 h-5 mt-2 rounded-full bg-[#d6d6d3] border-2 border-white" />
          <div className="w-[2px] flex-1 bg-[#d6d6d3]" />
        </div>
        <div className="w-[80px]" />
        <div className="flex flex-col md:flex-row gap-12 w-full bg-white rounded-xl shadow-md border border-[#d6d6d3] p-6">
          <div className="w-full md:w-1/3">
            <WinnerCard
              title={winner.title}
              imageUrl={winner.thumb_url}
              rating={winner.ranking}
            />
          </div>
          <div className="hidden md:block w-px bg-[#d6d6d3]" />
          <div className="w-full md:w-2/3">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 bg-[url('/icons/oscar.png')] bg-cover"
                aria-hidden="true"
              />
              <h3 className="text-xl font-bold text-[#7e7e7e] font-['Inter']">Nominees</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  title={movie.title}
                  imageUrl={movie.thumb_url}
                  rating={movie.ranking}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
