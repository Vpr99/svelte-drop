import * as utils from "./utils.js";
import { describe, test, expect, vi } from "vitest";

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

describe("groupListeners", () => {
  test("grouping listeners and calling callbacks", () => {
    const functionMock = vi.fn();
    const callbackMock = vi.fn();
    /**
     * `functionMock` should be called immediately whereas `callbackMock`
     * should be called when the group cleanup function is invoked.
     */
    function testFunction() {
      functionMock();
      return () => {
        callbackMock();
      };
    }

    // Create a listener group.
    const cleanup = utils.groupListeners(
      testFunction(),
      testFunction(),
      testFunction()
    );
    // Assert that `functionMock` was called 3x and `callbackMock` was not.
    expect(functionMock).toBeCalledTimes(3);
    expect(callbackMock).not.toBeCalled();
    // Invoke the cleanup function, which should fire the callbacks.
    cleanup();
    // Assert that `callbackMock` was called 3x.
    expect(callbackMock).toBeCalledTimes(3);
  });
});
