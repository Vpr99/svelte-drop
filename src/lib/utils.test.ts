import * as utils from "./utils.js";
import { describe, test, expect } from "vitest";

describe("getNextIndex", () => {
  test.each([
    // Incrementing within bounds.
    { currentIndex: 0, itemCount: 10, moveAmount: 1, expected: 1 },
    // Wrap from the top to the bottom.
    { currentIndex: 0, itemCount: 10, moveAmount: -1, expected: 9 },
    // Wrap from the bottom to the top.
    { currentIndex: 9, itemCount: 10, moveAmount: 1, expected: 0 },
    // No items.
    { currentIndex: 0, itemCount: 0, moveAmount: 1, expected: 0 },
    { currentIndex: 0, itemCount: 0, moveAmount: -1, expected: 0 },
    // Overshooting the bottom.
    { currentIndex: 5, itemCount: 10, moveAmount: 10, expected: 0 },
    // Overshooting the top.
    { currentIndex: 5, itemCount: 10, moveAmount: -10, expected: 9 },
  ])(
    "adding $moveAmount to $currentIndex -> $expected",
    ({ currentIndex, itemCount, moveAmount, expected }) => {
      expect(utils.getNextIndex({ currentIndex, itemCount, moveAmount })).toBe(
        expected
      );
    }
  );
});
