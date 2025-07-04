"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, Check, X, Crown, Trophy } from "lucide-react";
import Image from "next/image";
import type { Movie } from "@/types/types";

interface BestPictureNomineesProps {
  movies: Movie[];
  onNomineesChange?: (nominees: Movie[], winner?: Movie) => void;
  className?: string;
}

interface SortableMovieItemProps {
  movie: Movie;
  index: number;
  onRemove: (movieId: number) => void;
  isSelected: boolean;
  isWinner?: boolean;
}

function SortableMovieItem({ movie, index, onRemove, isSelected, isWinner = false }: SortableMovieItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: movie.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ranking = movie.rankings?.[0]?.ranking || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg shadow-sm ${
        isWinner 
          ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-md" 
          : "bg-white"
      } ${
        isDragging ? "shadow-lg z-50" : "hover:shadow-md"
      } transition-shadow`}
    >
      {/* Winner Crown */}
      {isWinner && (
        <div className="flex-shrink-0">
          <Crown className="w-6 h-6 text-yellow-500 fill-current" />
        </div>
      )}
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Rank Badge */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        isWinner 
          ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md" 
          : "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
      }`}>
        {isWinner ? <Trophy className="w-4 h-4" /> : index + 1}
      </div>

      {/* Movie Poster */}
      <div className="flex-shrink-0">
        <Image
          src={movie.thumb_url}
          alt={movie.title}
          width={60}
          height={90}
          className="rounded shadow-sm"
          unoptimized
        />
      </div>

      {/* Movie Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{movie.title}</h3>
        <p className="text-sm text-gray-600">{movie.release_year}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-medium text-gray-700">{ranking}/10</span>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(movie.id)}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        title="Remove from nominees"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function BestPictureNominees({ 
  movies, 
  onNomineesChange, 
  className = "" 
}: BestPictureNomineesProps) {
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [availableMovies, setAvailableMovies] = useState<Movie[]>([]);
  const [showSelection, setShowSelection] = useState(false);
  const [winner, setWinner] = useState<Movie | null>(null);
  const [showWinnerSelection, setShowWinnerSelection] = useState(false);
  const [topRankedMovies, setTopRankedMovies] = useState<Movie[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Filter movies with rankings and sort by ranking (highest first)
    const rankedMovies = movies
      .filter(movie => movie.rankings && movie.rankings.length > 0)
      .sort((a, b) => {
        const rankA = a.rankings?.[0]?.ranking || 0;
        const rankB = b.rankings?.[0]?.ranking || 0;
        return rankB - rankA;
      });

    // Auto-select top 10 if there are exactly 10 or fewer highly rated movies
    const highlyRated = rankedMovies.filter(movie => (movie.rankings?.[0]?.ranking || 0) >= 7);
    
    if (highlyRated.length <= 10) {
      setSelectedMovies(highlyRated);
      setAvailableMovies(rankedMovies.filter(movie => !highlyRated.includes(movie)));
    } else {
      // If more than 10 highly rated, show selection interface
      setAvailableMovies(rankedMovies);
      setShowSelection(true);
    }
  }, [movies]);

  useEffect(() => {
    onNomineesChange?.(selectedMovies, winner || undefined);
  }, [selectedMovies, winner, onNomineesChange]);

  // Detect winner when nominees change
  useEffect(() => {
    if (selectedMovies.length === 0) {
      setWinner(null);
      setShowWinnerSelection(false);
      setTopRankedMovies([]);
      return;
    }

    // Find the highest ranking among selected movies
    const highestRanking = Math.max(
      ...selectedMovies.map(movie => movie.rankings?.[0]?.ranking || 0)
    );

    // Find all movies with the highest ranking
    const topMovies = selectedMovies.filter(
      movie => (movie.rankings?.[0]?.ranking || 0) === highestRanking
    );

    setTopRankedMovies(topMovies);

    if (topMovies.length === 1) {
      // Auto-assign winner if only one movie has top ranking
      setWinner(topMovies[0]);
      setShowWinnerSelection(false);
    } else if (topMovies.length > 1) {
      // Show winner selection if multiple movies tied for top ranking
      if (!winner || !topMovies.includes(winner)) {
        setWinner(null);
        setShowWinnerSelection(true);
      }
    }
  }, [selectedMovies, winner]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSelectedMovies((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddMovie = (movie: Movie) => {
    if (selectedMovies.length < 10) {
      setSelectedMovies(prev => [...prev, movie]);
      setAvailableMovies(prev => prev.filter(m => m.id !== movie.id));
    }
  };

  const handleRemoveMovie = (movieId: number) => {
    const movieToRemove = selectedMovies.find(m => m.id === movieId);
    if (movieToRemove) {
      setSelectedMovies(prev => prev.filter(m => m.id !== movieId));
      setAvailableMovies(prev => [...prev, movieToRemove].sort((a, b) => {
        const rankA = a.rankings?.[0]?.ranking || 0;
        const rankB = b.rankings?.[0]?.ranking || 0;
        return rankB - rankA;
      }));
    }
  };

  const handleSelectWinner = (movie: Movie) => {
    setWinner(movie);
    setShowWinnerSelection(false);
  };

  const handleChangeWinner = () => {
    setShowWinnerSelection(true);
  };

  const canAddMore = selectedMovies.length < 10;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Best Picture Nominees</h2>
          <p className="text-gray-600">
            Select up to 10 movies as your Best Picture nominees
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {selectedMovies.length}/10
          </div>
          <div className="text-sm text-gray-500">nominees selected</div>
        </div>
      </div>

      {/* Selected Movies - Drag and Drop List */}
      {selectedMovies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Your Nominees</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={selectedMovies.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {selectedMovies.map((movie, index) => (
                  <SortableMovieItem
                    key={movie.id}
                    movie={movie}
                    index={index}
                    onRemove={handleRemoveMovie}
                    isSelected={true}
                    isWinner={winner?.id === movie.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Winner Selection UI */}
      {selectedMovies.length > 0 && (
        <div className="space-y-3">
          {winner && !showWinnerSelection ? (
            // Show current winner
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-yellow-500 fill-current" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Best Picture Winner</h3>
                    <p className="text-sm text-gray-600">Your top choice among the nominees</p>
                  </div>
                </div>
                {topRankedMovies.length > 1 && (
                  <button
                    onClick={handleChangeWinner}
                    className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    Change Winner
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 p-3 bg-white border border-yellow-200 rounded-lg">
                <Image
                  src={winner.thumb_url}
                  alt={winner.title}
                  width={60}
                  height={90}
                  className="rounded shadow-sm"
                  unoptimized
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{winner.title}</h4>
                  <p className="text-sm text-gray-600">{winner.release_year}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-gray-700">
                      {winner.rankings?.[0]?.ranking || 0}/10
                    </span>
                  </div>
                </div>
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          ) : showWinnerSelection && topRankedMovies.length > 1 ? (
            // Show winner selection UI
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pick Your Winner</h3>
                  <p className="text-sm text-gray-600">
                    Multiple movies are tied for the highest ranking. Choose your Best Picture winner:
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                {topRankedMovies.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => handleSelectWinner(movie)}
                    className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <Image
                      src={movie.thumb_url}
                      alt={movie.title}
                      width={60}
                      height={90}
                      className="rounded shadow-sm"
                      unoptimized
                    />
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-900">
                        {movie.title}
                      </h4>
                      <p className="text-sm text-gray-600">{movie.release_year}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium text-gray-700">
                          {movie.rankings?.[0]?.ranking || 0}/10
                        </span>
                      </div>
                    </div>
                    <div className="text-blue-600 group-hover:text-blue-700">
                      <Crown className="w-6 h-6" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Available Movies for Selection */}
      {(showSelection || canAddMore) && availableMovies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Available Movies</h3>
            {!canAddMore && (
              <span className="text-sm text-red-600 font-medium">
                Maximum 10 nominees selected
              </span>
            )}
          </div>
          <div className="grid gap-2 max-h-96 overflow-y-auto">
            {availableMovies.map((movie) => {
              const ranking = movie.rankings?.[0]?.ranking || 0;
              const isHighlyRated = ranking >= 7;
              
              return (
                <div
                  key={movie.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                    isHighlyRated 
                      ? "border-yellow-300 bg-yellow-50" 
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {/* Movie Poster */}
                  <div className="flex-shrink-0">
                    <Image
                      src={movie.thumb_url}
                      alt={movie.title}
                      width={40}
                      height={60}
                      className="rounded shadow-sm"
                      unoptimized
                    />
                  </div>

                  {/* Movie Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{movie.title}</h4>
                    <p className="text-sm text-gray-600">{movie.release_year}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-700">{ranking}/10</span>
                      {isHighlyRated && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full ml-2">
                          Highly Rated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => handleAddMovie(movie)}
                    disabled={!canAddMore}
                    className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                      canAddMore
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                    title={canAddMore ? "Add to nominees" : "Maximum nominees reached"}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedMovies.length === 0 && availableMovies.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No rated movies found. Start rating movies to create your nominees list!</p>
        </div>
      )}
    </div>
  );
}
