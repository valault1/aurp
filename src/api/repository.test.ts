import { ApiSheetRange } from "api/requestBuilders";
import { consolidateRanges } from "api/repository";
const sheetId = 123;
const startRowIndex = 1;
const endRowIndex = 1;
const startColumnIndex = 2;
const endColumnIndex = 3;

const createRange = (
  startRowIndex: number,
  endRowIndex?: number
): ApiSheetRange => ({
  sheetId,
  startRowIndex,
  endRowIndex: endRowIndex || startRowIndex + 1,
  startColumnIndex,
  endColumnIndex,
});

describe("consolidateRanges", () => {
  it("works", () => {
    const ranges: ApiSheetRange[] = [
      createRange(1),
      createRange(2),
      createRange(3),
      createRange(5),
      createRange(7),
      createRange(9),
      createRange(10),
      createRange(11),
      createRange(12),
      createRange(13),
    ];
    const result = consolidateRanges(ranges);
    const expectedResult: ApiSheetRange[] = [
      createRange(9, 14),
      createRange(7),
      createRange(5),
      createRange(1, 4),
    ];
    expect(result).toEqual(expectedResult);
  });

  it("works with 1 element", () => {
    const ranges: ApiSheetRange[] = [createRange(1)];
    const result = consolidateRanges(ranges);
    const expectedResult: ApiSheetRange[] = [createRange(1)];
    expect(result).toEqual(expectedResult);
  });

  it("works with 2 elements", () => {
    const ranges: ApiSheetRange[] = [createRange(1)];
    const result = consolidateRanges(ranges);
    const expectedResult: ApiSheetRange[] = [createRange(1)];
    expect(result).toEqual(expectedResult);
  });

  it("works with 2 continous elements", () => {
    const ranges: ApiSheetRange[] = [createRange(1), createRange(2)];
    const result = consolidateRanges(ranges);
    const expectedResult: ApiSheetRange[] = [createRange(1, 3)];
    expect(result).toEqual(expectedResult);
  });

  it("works with 1 continuous range", () => {
    const ranges: ApiSheetRange[] = [
      createRange(1),
      createRange(2),
      createRange(3),
      createRange(4),
      createRange(5),
      createRange(6),
      createRange(7),
    ];
    const result = consolidateRanges(ranges);
    const expectedResult: ApiSheetRange[] = [createRange(1, 8)];
    expect(result).toEqual(expectedResult);
  });
});
