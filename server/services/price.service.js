// Crypto price fetcher with caching for API rate limiting
import axios from "axios";

// Cache variables to reduce API calls
let cachedPrices = null; // Stores last fetched prices
let lastFetch = 0; // Timestamp of last API call

export const getCryptoPrice = async (ids = ["bitcoin", "ethereum"]) => {
  const now = Date.now();

  // Return cached data if less than 10 seconds old
  if (cachedPrices && now - lastFetch < 10_000) return cachedPrices;

  // Using CoinMarketCap API with free tier
  try {
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": process.env.API_KEY,
          Accept: "application/json",
          "Accept-Encoding": "deflate, gzip",
        },
        params: {
          symbol: "BTC,ETH",
          convert: "USD",
        },
      }
    );

    // Transform CoinMarketCap response
    const data = {
      bitcoin: {
        usd: response.data.data.BTC.quote.USD.price,
      },
      ethereum: {
        usd: response.data.data.ETH.quote.USD.price,
      },
    };

    // Update cache with new data
    cachedPrices = data;
    lastFetch = now;

    return data;
  } catch (error) {
    console.error("CoinMarketCap API Error:", error.message);

    // Return cached data if available
    if (cachedPrices) {
      console.log("Using cached prices due to API error");
      return cachedPrices;
    }

    throw error;
  }
};
