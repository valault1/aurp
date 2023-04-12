import { Restaurant } from "api/entityDefinitions";

export const selectTags = (restaurants: Restaurant[]) => {
  let tags: { [key: string]: boolean } = {};
  for (let restaurant of restaurants) {
    for (let tag of restaurant.tags) {
      tags[tag] = true;
    }
  }

  return Object.keys(tags);
};
