// read the data from the googel sheets.
// input: data - all cells from the restaurants sheet
export const selectRestaurants = (data?: string[][]): Restaurant[] => {
  if (!data) return [];
};
