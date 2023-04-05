import { Restaurant } from "domains/Restaurants/sharedTypes";

// input: data - all cells from the restaurants sheet
export const selectRestaurants = (
  data?: string[][],
  userId?: string
): Restaurant[] => {
  if (!data || !userId) return [];
  const userRestaurants = data
    .filter((row) => row[0] === userId)
    .map((row) => ({
      name: row[1],
      tags: row[2].split(","),
    }));

  return userRestaurants;
};

export const selectTags = (restaurants: Restaurant[]) => {
  let tags: { [key: string]: boolean } = {};
  for (let restaurant of restaurants) {
    for (let tag of restaurant.tags) {
      tags[tag] = true;
    }
  }

  return Object.keys(tags);
};
