import React from "react";
import Search from "./components/Search";
import { useEffect, useState } from "react";
import Spinner from "./components/Spinner";
import MovieCard from "./components/MovieCard";
import { useDebounce } from "react-use";
import { getTrendingMovies, updateSearchCount } from "./appwrite";
import { SignedIn, SignedOut, SignIn, SignInButton, UserButton } from '@clerk/clerk-react';

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [movieList, setMovieList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [trendingMovies, setTrendingMovies] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("");

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

  const fetchMovies = async (query = "", pageNum = 1) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const genreParam = selectedGenre ? `&with_genres=${selectedGenre}` : "";
      const endpoint = query
        ? `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&with_keywords=${encodeURIComponent(
            query
          )}&page=${pageNum}${genreParam}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&page=${pageNum}${genreParam}`;

      const response = await fetch(endpoint, API_OPTIONS);
      if (!response.ok) throw new Error("Failed to fetch movies");

      const data = await response.json();
      setMovieList(data.results || []);
      setTotalPages(data.total_pages || 1);

      if (query && data.results.length > 0) {
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage("Error fetching movies. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();
      setTrendingMovies(movies);
    } catch (e) {
      console.error(`Error fetching trending movies ${e}`);
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/genre/movie/list`, API_OPTIONS);
      const data = await res.json();
      console.log("Fetched genres:", data.genres);
      setGenres(data.genres);
    } catch (err) {
      console.error("Failed to fetch genres", err);
    }
  };

  useEffect(() => {
    fetchMovies(debouncedSearchTerm, page);
  }, [debouncedSearchTerm, page, selectedGenre]);

  useEffect(() => {
    loadTrendingMovies();
    fetchGenres();
  }, []);

  return (
    <main>
        <SignedOut>
          <section className="w-full h-[100vh] flex justify-center items-center">
            <SignIn />
          </section>
        </SignedOut>
      <SignedIn>
        <main>
          <div className="pattern">
            <div className="wrapper">
              <header>
                <img src="./hero.png" alt="Hero Banner"></img>
                <h1>
                  Find <span className="text-gradient">Movies</span> Without Hassle
                </h1>
                <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              </header>

              {trendingMovies.length > 0 && (
                <section className="trending">
                  <h2>Trending Movies</h2>
                  <ul>
                    {trendingMovies.map((movie, index) => (
                      <li key={movie.$id}>
                        <p>{index + 1}</p>
                        <img src={movie.poster_url} alt={movie.title} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="all-movies">
                <h2>All Movies</h2>

                <div className="filters flex flex-wrap gap-4 my-4">
                  {genres.length > 0 ? (
                    <select
                      className="p-2 rounded bg-gray-800 text-white"
                      value={selectedGenre}
                      onChange={(e) => {
                        setSelectedGenre(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">All Genres</option>
                      {genres.map((genre) => (
                        <option key={genre.id} value={genre.id}>
                          {genre.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-400">
                      Loading genres or failed to fetch.
                    </p>
                  )}
                </div>

                {isLoading ? (
                  <Spinner />
                ) : errorMessage ? (
                  <p className="text-red-500">{errorMessage}</p>
                ) : movieList.length === 0 && debouncedSearchTerm ? (
                  <p className="text-white">No search results found</p>
                ) : (
                  <>
                    <ul>
                      {movieList.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                      ))}
                    </ul>

                    {totalPages > 1 && (
                      <div className="pagination flex gap-4 justify-center items-center mt-4">
                        <button
                          className="bg-gray-700 px-3 py-1 rounded"
                          onClick={() => setPage((p) => Math.max(p - 1, 1))}
                          disabled={page === 1}
                        >
                          Prev
                        </button>
                        <span className="text-white">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          className="bg-gray-700 px-3 py-1 rounded"
                          onClick={() =>
                            setPage((p) => Math.min(p + 1, totalPages))
                          }
                          disabled={page === totalPages}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        </main>
      </SignedIn>
    </main>
  );
};

export default App;
