const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w342';
const BANNER_IMAGE_SIZE = 'w1280';
const WATCHLIST_KEY = 'streamverse_watchlist';

// Replace 'YOUR_API_KEY' with your actual TMDB API key
const API_KEY = "8c8d820e634ffb4be53dc0f550b7d7eb"; // Your API key

const requests = {
    fetchTrending: `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`,
    fetchTopRated: `${BASE_URL}/movie/top_rated?api_key=${API_KEY}`,
    fetchActionMovies: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28`,
};

const banner = document.querySelector('.banner');
const bannerTitle = document.querySelector('.banner-title');
const bannerDescription = document.querySelector('.banner-description');
const bannerPlayButton = document.querySelector('.play-button');
const bannerMoreInfoButton = document.querySelector('.more-info-button');
const trendingNowRow = document.querySelector('#trending-now .movie-row');
const topRatedRow = document.querySelector('#top-rated .movie-row');
const actionMoviesRow = document.querySelector('#action-movies .movie-row');
const trailerModal = document.getElementById('trailer-modal');
const trailerPlayer = document.getElementById('trailer-player');
const closeModalButton = document.querySelector('.close-button');
const searchBarInput = document.querySelector('.search-bar input[type="text"]');
const movieSections = [trendingNowRow, topRatedRow, actionMoviesRow];

let currentBannerMovie = null;
let currentlyPlayingTrailerCard = null;

function getWatchlist() {
    const storedList = localStorage.getItem(WATCHLIST_KEY);
    return storedList ? JSON.parse(storedList) : [];
}

function saveWatchlist(watchlist) {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
}

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

async function fetchMovieDetails(movieId) {
    const url = `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

async function fetchMovieTrailers(movieId) {
    const url = `${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const trailers = data.results.filter(video => video.type === 'Trailer' && video.site === 'YouTube');
        return trailers.length > 0 ? trailers[0].key : null;
    } catch (error) {
        console.error('Error fetching movie trailers:', error);
        return null;
    }
}

async function setBanner() {
    const movies = await fetchData(requests.fetchTrending);
    if (movies.length > 0) {
        currentBannerMovie = movies[Math.floor(Math.random() * movies.length)];
        // Corrected URL for banner background image
        banner.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 80%), url(${IMAGE_BASE_URL}${BANNER_IMAGE_SIZE}${currentBannerMovie.backdrop_path})`;
        bannerTitle.textContent = currentBannerMovie.title || currentBannerMovie.name;
        bannerDescription.textContent = truncateString(currentBannerMovie.overview, 150);

        bannerPlayButton.addEventListener('click', async () => {
            if (currentBannerMovie) {
                const trailerKey = await fetchMovieTrailers(currentBannerMovie.id);
                if (trailerKey) {
                    playTrailerModal(trailerKey);
                } else {
                    alert('No trailer found for this movie.');
                }
            }
        });

        if (bannerMoreInfoButton) {
            bannerMoreInfoButton.addEventListener('click', () => {
                if (currentBannerMovie) {
                    fetchMovieDetails(currentBannerMovie.id)
                        .then(details => {
                            if (details) {
                                alert(`More Info:\nTitle: ${details.title || details.name}\nOverview: ${details.overview}\nRating: ${details.vote_average}`);
                                console.log("More Info:", details);
                            } else {
                                alert("Could not retrieve more info.");
                            }
                        });
                }
            });
        }
    } else {
        // Fallback for banner if no movies are fetched
        banner.style.backgroundImage = 'url(images/placeholder.jpg)'; // Ensure this path is correct
        bannerTitle.textContent = 'Welcome to Premier Stream';
        bannerDescription.textContent = 'Discover amazing movies and TV shows.';
        bannerPlayButton.style.display = 'none';
        if (bannerMoreInfoButton) bannerMoreInfoButton.style.display = 'none';
    }
}

function updateWatchlistButton(button, movieId) {
    const watchlist = getWatchlist();
    const isInWatchlist = watchlist.some(item => item.id === movieId);
    button.innerHTML = isInWatchlist ? '<i class="fas fa-check"></i> Watchlisted' : '<i class="fas fa-plus"></i> Watchlist';
    button.classList.toggle('watchlisted', isInWatchlist);
}

function createMovieCards(movies, container) {
    container.innerHTML = '';
    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');

        const imagePath = movie.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}` : 'images/placeholder.jpg'; // Ensure this path is correct
        movieCard.innerHTML = `
            <img src="${imagePath}" alt="${movie.title || movie.name}">
            <div class="trailer-container">
            </div>
            <div class="movie-card-overlay">
                <button class="play-btn" data-movie-id="${movie.id}" data-movie-title="${movie.title || movie.name}">
                    <i class="fas fa-play"></i> Play
                </button>
                <button class="add-watchlist-btn" data-movie-id="${movie.id}">
                    <i class="fas fa-plus"></i> Watchlist
                </button>
                <button class="download-btn" data-movie-id="${movie.id}" data-movie-title="${movie.title || movie.name}">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;

        const playButton = movieCard.querySelector('.play-btn');
        const trailerContainer = movieCard.querySelector('.trailer-container');
        const posterImage = movieCard.querySelector('img');
        const watchlistBtn = movieCard.querySelector('.add-watchlist-btn');
        const downloadBtn = movieCard.querySelector('.download-btn');

        playButton.addEventListener('click', async (event) => {
            event.stopPropagation();
            const movieId = playButton.dataset.movieId;
            const trailerKey = await fetchMovieTrailers(movieId);
            if (trailerKey) {
                if (currentlyPlayingTrailerCard && currentlyPlayingTrailerCard !== movieCard) {
                    const prevTrailerContainer = currentlyPlayingTrailerCard.querySelector('.trailer-container');
                    const prevPosterImage = currentlyPlayingTrailerCard.querySelector('img');
                    if (prevTrailerContainer) prevTrailerContainer.innerHTML = '';
                    if (prevPosterImage) prevPosterImage.style.display = 'block';
                }

                currentlyPlayingTrailerCard = movieCard;
                trailerContainer.innerHTML = '';
                const youtubeEmbedUrl = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1`;
                const iframe = document.createElement('iframe');
                iframe.src = youtubeEmbedUrl;
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
                trailerContainer.appendChild(iframe);
                posterImage.style.display = 'none'; // Hide poster when trailer plays
                trailerContainer.style.position = 'absolute';
                trailerContainer.style.top = '0';
                trailerContainer.style.left = '0';
                trailerContainer.style.width = '100%';
                trailerContainer.style.height = '100%';
                trailerContainer.style.zIndex = '1';
            } else {
                alert('No trailer found for this movie.');
            }
        });

        updateWatchlistButton(watchlistBtn, movie.id);

        watchlistBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const movieId = parseInt(watchlistBtn.dataset.movieId);
            const movieTitle = movie.title || movie.name;
            let watchlist = getWatchlist();
            const index = watchlist.findIndex(item => item.id === movieId);

            if (index === -1) {
                watchlist.push({ id: movieId, title: movieTitle, poster_path: movie.poster_path }); // Store poster path for My List
                console.log(`Added to Watchlist: ${movieTitle} (ID: ${movieId})`);
            } else {
                watchlist.splice(index, 1);
                console.log(`Removed from Watchlist: ${movieTitle} (ID: ${movieId})`);
            }
            saveWatchlist(watchlist);
            updateWatchlistButton(watchlistBtn, movieId);
        });

        downloadBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const movieId = parseInt(downloadBtn.dataset.movieId);
            const movieTitle = downloadBtn.dataset.movieTitle;
            let downloads = localStorage.getItem('streamverse_downloads');
            downloads = downloads ? JSON.parse(downloads) : [];
            const isDownloaded = downloads.some(item => item.id === movieId);

            if (!isDownloaded) {
                downloads.push({ id: movieId, title: movieTitle });
                localStorage.setItem('streamverse_downloads', JSON.stringify(downloads));
                alert(`Added "${movieTitle}" to Downloads.`);
                console.log(`Added to Downloads: ${movieTitle} (ID: ${movieId})`);
            } else {
                alert(`"${movieTitle}" is already in your Downloads.`);
            }
        });

        movieCard.addEventListener('click', () => {
            fetchMovieDetails(movie.id)
                .then(details => {
                    if (details) {
                        alert(`More Info:\nTitle: ${details.title || details.name}\nOverview: ${truncateString(details.overview, 200)}\nRating: ${details.vote_average}`);
                        console.log("Movie Card Clicked - More Info:", details);
                    } else {
                        alert("Could not retrieve movie details.");
                    }
                });
        });

        container.appendChild(movieCard);
    });
}

function truncateString(str, num) {
    if (!str) return ''; // Handle null or undefined strings
    if (str.length <= num) {
        return str;
    }
    return str.slice(0, num) + '...';
}

function playTrailerModal(trailerKey) {
    const youtubeEmbedUrl = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&iv_load_policy=3`;
    console.log("Modal Trailer URL:", youtubeEmbedUrl); // Add this line
    trailerPlayer.innerHTML = `<iframe width="100%" height="100%" src="${youtubeEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    trailerModal.style.display = "flex";
}

closeModalButton.addEventListener('click', () => {
    trailerModal.style.display = "none";
    trailerPlayer.innerHTML = '';
});

window.addEventListener('click', (event) => {
    if (event.target == trailerModal) {
        trailerModal.style.display = "none";
        trailerPlayer.innerHTML = '';
    }
});

async function loadMovies() {
    const trendingMovies = await fetchData(requests.fetchTrending);
    if (trendingMovies.length > 0) {
        setBanner(trendingMovies[Math.floor(Math.random() * trendingMovies.length)]);
        createMovieCards(trendingMovies, trendingNowRow);
    } else {
        setBanner(null); // Call setBanner with null to show fallback
    }

    const topRatedMovies = await fetchData(requests.fetchTopRated);
    createMovieCards(topRatedMovies, topRatedRow);

    const actionMovies = await fetchData(requests.fetchActionMovies);
    createMovieCards(actionMovies, actionMoviesRow);
}

document.addEventListener('DOMContentLoaded', () => {
    loadMovies();

    // Search functionality
    if (searchBarInput) {
        searchBarInput.addEventListener('input', async (event) => {
            const query = event.target.value.trim();
            if (query) {
                const searchUrl = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
                const searchResults = await fetchData(searchUrl);

                // Clear existing movie sections and update titles
                movieSections.forEach(section => {
                    if (section && section.parentElement) {
                        section.innerHTML = '';
                        const categoryTitle = section.parentElement.querySelector('h2');
                        if (categoryTitle) {
                            categoryTitle.textContent = `Search Results for "${query}"`;
                        }
                    }
                });

                // Display search results in the first section
                if (trendingNowRow) {
                    createMovieCards(searchResults, trendingNowRow);
                }
            } else {
                // If the search query is empty, reload the default movies and reset titles
                movieSections.forEach(section => {
                    if (section && section.parentElement) {
                        const categoryTitle = section.parentElement.querySelector('h2');
                        if (categoryTitle) {
                            if (section === trendingNowRow) categoryTitle.textContent = 'Trending Now';
                            else if (section === topRatedRow) categoryTitle.textContent = 'Top Rated';
                            else if (section === actionMoviesRow) categoryTitle.textContent = 'Action Movies';
                        }
                    }
                });
                loadMovies(); // Reload original categories
            }
        });
    }
});

const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
    header.style.backgroundColor = window.scrollY > 50 ? '#141414' : 'transparent';
});

// Assuming you want to keep the navigation links for future expansion
const navLinks = document.querySelectorAll('.main-nav-links li a');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // e.preventDefault(); // Uncomment if you want to prevent default link behavior
        const category = link.textContent.toLowerCase().replace(' ', '-');
        console.log(`Navigating to: ${link.textContent} (Category: ${category})`);
        // Here you would typically load content based on the category or navigate to a new page
    });
});