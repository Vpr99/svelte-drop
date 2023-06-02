interface NextIndexInput {
  /** Currently selected item index. */
  currentIndex: number;
  /** The number of items in the list. */
  itemCount: number;
  /**
   * The number of items to traverse in the list. Eg:
   * +10 would move down 10 items.
   * -10 would move up 10 items.
   */
  moveAmount: number;
}

/**
 * Returns the next index in an array based on the current index
 * and move amount. If the next index is out of bounds, it will
 * wrap around to the other end of the array.
 */
export function getNextIndex({
  currentIndex,
  itemCount,
  moveAmount,
}: NextIndexInput): number {
  // Return early if there are no items.
  if (itemCount === 0) {
    return 0;
  }
  // Get the index of the last item in the list.
  const lastItemIndex = itemCount - 1;
  // Compute the next index by adding the move amount to the current index.
  const nextIndex = currentIndex + moveAmount;
  // If the computed index is negative, wrap back to the bottom of the list.
  if (nextIndex < 0) {
    return lastItemIndex;
  }
  // If the computed index is out of bounds, wrap back to the top of the list.
  if (nextIndex > lastItemIndex) {
    return 0;
  }
  // Otherwise, return the computed index.
  return nextIndex;
}

export const keyboardKeys = {
  ArrowDown: "ArrowDown",
  ArrowUp: "ArrowUp",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Escape: "Escape",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Shift: "Shift",
  CapsLock: "CapsLock",
  Control: "Control",
  Alt: "Alt",
  Meta: "Meta",
  Enter: "Enter",
  Backspace: "Backspace",
  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  F10: "F10",
  F11: "F11",
  F12: "F12",
};

export const interactionKeys = new Set([
  keyboardKeys.ArrowLeft,
  keyboardKeys.ArrowRight,
  keyboardKeys.Shift,
  keyboardKeys.CapsLock,
  keyboardKeys.Control,
  keyboardKeys.Alt,
  keyboardKeys.Meta,
  keyboardKeys.Enter,
  keyboardKeys.F1,
  keyboardKeys.F2,
  keyboardKeys.F3,
  keyboardKeys.F4,
  keyboardKeys.F5,
  keyboardKeys.F6,
  keyboardKeys.F7,
  keyboardKeys.F8,
  keyboardKeys.F9,
  keyboardKeys.F10,
  keyboardKeys.F11,
  keyboardKeys.F12,
]);

type EventsFor<T> = T extends Window
  ? WindowEventMap
  : T extends Document
  ? DocumentEventMap
  : T extends HTMLElement
  ? HTMLElementEventMap
  : GlobalEventHandlersEventMap;

export function addEventListener<
  T extends EventTarget,
  K extends keyof EventsFor<T> & string
>(
  target: T,
  eventName: K,
  eventListener: (event: EventsFor<T>[K]) => void,
  opts?: AddEventListenerOptions
) {
  // @ts-expect-error the various EventMap types aren't narrowed correctly.
  const listener: EventListener = eventListener;
  target.addEventListener(eventName, listener, opts);
  return function () {
    target.removeEventListener(eventName, listener, opts);
  };
}

export function groupListeners(...callbacks: (() => void)[]): () => void {
  return function () {
    callbacks.forEach((callback) => callback());
  };
}

/** @TODO maybe support an array of attributes? */
export function setAttribute(
  el: Element,
  qualifiedName: string,
  value?: unknown
) {
  value
    ? el.setAttribute(qualifiedName, String(value))
    : el.setAttribute(qualifiedName, "");
}
