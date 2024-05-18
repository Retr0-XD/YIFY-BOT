import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { YifyService } from 'yify-api';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const yifyService = new YifyService();

async function getMovieDetails(query) {
  try {
    const response = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${query}&limit=50`);
    const data = await response.json();
    if (data.data.movies && data.data.movies.length > 0) {
      return data.data.movies;
    } else {
      return 'No movies found with this name.';
    }
  } catch (error) {
    console.error('Error fetching data from YTS API:', error);
    return 'An error occurred while fetching the movie details.';
  }
}

async function getSeriesDetails(query) {
  try {
    const response = await yifyService.getMovies({ query_term: query, limit: 50 });
    if (response.data.movies && response.data.movies.length > 0) {
      return response.data.movies;
    } else {
      return 'No series found with this name.';
    }
  } catch (error) {
    console.error('Error fetching data from YIFY API:', error);
    return 'An error occurred while fetching the series details.';
  }
}

async function getMovieDetailsById(movieId) {
  try {
    const response = await fetch(`https://yts.mx/api/v2/movie_details.json?movie_id=${movieId}`);
    const data = await response.json();
    if (data.data.movie && data.data.movie.torrents) {
      return data.data.movie;
    } else {
      return 'No torrents found for this movie.';
    }
  } catch (error) {
    console.error('Error fetching movie details from YTS API:', error);
    return 'An error occurred while fetching the movie details.';
  }
}

bot.start((ctx) => {
  ctx.reply('Welcome! Use /movie <name> to search for movies or /series <name> to search for TV series.');
});

bot.command('movie', async (ctx) => {
  const movieName = ctx.message.text.split('/movie ')[1];
  if (!movieName) {
    ctx.reply('Please provide a movie name.');
    return;
  }
  const movieDetails = await getMovieDetails(movieName);

  if (typeof movieDetails === 'string') {
    ctx.reply(movieDetails);
  } else {
    const movieOptions = movieDetails.map(movie => ({
      text: `${movie.title} (${movie.year})`,
      callback_data: `movie_${movie.id}`
    }));

    ctx.reply('Select the movie:', {
      reply_markup: {
        inline_keyboard: movieOptions.map(option => [option])
      }
    });
  }
});

bot.command('series', async (ctx) => {
  const seriesName = ctx.message.text.split('/series ')[1];
  if (!seriesName) {
    ctx.reply('Please provide a series name.');
    return;
  }
  const seriesDetails = await getSeriesDetails(seriesName);

  if (typeof seriesDetails === 'string') {
    ctx.reply(seriesDetails);
  } else {
    const seriesOptions = seriesDetails.map(series => ({
      text: `${series.title} (${series.year})`,
      callback_data: `series_${series.id}`
    }));

    ctx.reply('Select the series:', {
      reply_markup: {
        inline_keyboard: seriesOptions.map(option => [option])
      }
    });
  }
});

bot.on('callback_query', async (ctx) => {
  const callbackData = ctx.callbackQuery.data;

  if (callbackData.startsWith('movie_')) {
    const movieId = callbackData.split('_')[1];
    const movieDetails = await getMovieDetailsById(movieId);
    if (typeof movieDetails === 'string') {
      ctx.reply(movieDetails);
    } else {
      const magnetLinks = movieDetails.torrents.map(torrent => ({
        text: `${torrent.quality} ${torrent.type}`,
        url: torrent.url
      }));
      ctx.reply('Select the quality:', {
        reply_markup: {
          inline_keyboard: magnetLinks.map(link => [link])
        }
      });
    }
  } else if (callbackData.startsWith('series_')) {
    const seriesId = callbackData.split('_')[1];
    const seriesDetails = await getMovieDetailsById(seriesId); // Adjust this if you have a specific endpoint for series details

    if (typeof seriesDetails === 'string') {
      ctx.reply(seriesDetails);
    } else {
      const seasonOptions = seriesDetails.torrents.map(link => ({
        text: link.quality,
        url: link.url
      }));

      ctx.reply('Select the quality:', {
        reply_markup: {
          inline_keyboard: seasonOptions.map(option => [option])
        }
      });
    }
  }
});

bot.launch();
