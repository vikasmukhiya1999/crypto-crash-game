// Crypto price fetcher with caching for API rate limiting
import axios from "axios";

// Cache variables to reduce API calls
let cachedPrices = null; // Stores last fetched prices
let lastFetch = 0; // Timestamp of last API call

export const getCryptoPrice = async (ids = ["bitcoin", "ethereum"]) => {
  const now = Date.now();

  // Return cached data if less than 10 seconds old
  if (cachedPrices && now - lastFetch < 10_000) return cachedPrices;

  // Build CoinGecko API URL with crypto IDs
  const url = `${process.env.COINGECKO_API}?ids=${ids.join(
    ","
  )}&vs_currencies=usd`;

  // Fetch fresh prices from API
  const { data } = await axios.get(url);

  // Update cache with new data
  cachedPrices = data;
  lastFetch = now;

  return data;
};
