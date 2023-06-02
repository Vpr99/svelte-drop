import { createNanoEvents } from "nanoevents";
import { nanoid } from "nanoid";
import { tick } from "svelte";
import type { Action } from "svelte/action";
import type {
  HTMLAttributes,
  HTMLInputAttributes,
  HTMLLabelAttributes,
} from "svelte/elements";
import {
  derived,
  readonly,
  writable,
  type Readable,
  type Writable,
} from "svelte/store";
import {
  addEventListener,
  getNextIndex,
  groupListeners,
  interactionKeys,
  keyboardKeys,
  setAttribute,
} from "./utils.js";

interface ComboboxProps<T> {
  items: Writable<T[]>;
  /** @see https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView#block */
  scrollAlignment?: "nearest" | "center";
  itemToString: (item: T) => string;
  filterFunction: (value: string) => void;
  selectItem?: (item: T) => void;
}

interface Combobox<T> {
  isOpen: Readable<boolean>;
  filterInput: Action<HTMLInputElement>;
  listItem: Action<HTMLLIElement>;
  // @TODO: support OL, DL, div, nav, etc
  list: Action<HTMLUListElement>;
  filterInputAttributes: Readable<HTMLInputAttributes>;
  labelAttributes: HTMLLabelAttributes;
  listAttributes: HTMLAttributes<
    HTMLUListElement | HTMLOListElement | HTMLDListElement
  >;
  selectedItem: Readable<T>;
  inputValue: Readable<string>;
}

export function createCombobox<T>({
  items,
  scrollAlignment = "nearest",
  itemToString,
  filterFunction,
  selectItem,
}: ComboboxProps<T>): Combobox<T> {
  const id = nanoid(6);
  const isOpen = writable(false);
  const selectedItem = writable<T>(undefined);
  const itemCount = writable(0);
  let trapFocus = false;
  const inputValue = writable("");
  const emitter = createNanoEvents();

  const labelAttributes = {
    id: `${id}-label`,
    for: `${id}-input`,
  };

  const listAttributes = {
    id: `${id}-menu`,
    role: "listbox",
  };

  let store$: {
    isOpen: boolean;
    itemCount: number;
    items: T[];
  };

  const state = derived(
    [isOpen, itemCount, items],
    ([isOpen, itemCount, items]) => ({ isOpen, itemCount, items })
  );

  // @TODO: unsure if we need to unsubscribe from this value when the component using `createCombobox` is unmounted
  state.subscribe((value) => {
    store$ = value;

    /*
     * Tick definition:
     *
     * "[Tick] returns a promise that resolves as soon as any pending state changes have been
     *  applied to the DOM [...]. When you update component state in Svelte, it doesn't update
     *  the DOM immediately. Instead, it waits until the next microtask to see if there are any
     *  other changes that need to be applied..."
     *
     * [source](https://svelte.dev/tutorial/tick)
     */
    void tick().then(() => emitter.emit("update"));
  });

  // @TODO change name?
  // @TODO add `satisfies` maybe?
  // @TODO see if we can do without `as const`.
  const filterInputAttributes = derived(
    [isOpen],
    ([isOpen]) =>
      ({
        "aria-autocomplete": "list",
        "aria-controls": `${id}-menu`,
        "aria-expanded": isOpen,
        "aria-labelledby": `${id}-label`,
        autocomplete: "off",
        id: `${id}-input`,
        role: "combobox",
      } as const)
  );

  // Close the menu.
  function close() {
    // - trap focus is true when the optional button next to the input is actively being clicked
    // - this is true for all close events, including escape
    if (!trapFocus) {
      isOpen.set(false);
    }
  }

  // Open the menu and focus the input.
  function open() {
    isOpen.set(true);
    document?.getElementById(`${id}-input`)?.focus();
  }

  function setSelectedItem(index: number, input: HTMLInputElement | null) {
    const string = itemToString(store$.items[index]);
    selectedItem.set(store$.items[index]);

    // @TODO: think through if this should be a required argument (aka: internally handled or always externally managed (or both))
    selectItem && selectItem(store$.items[index]);
    filterFunction(string);

    if (input) {
      input.value = string;
    }
  }

  /**
   * Highlights an item in the list either by mouseover or keyboard navigation.
   * @param index index of the item to highlight.
   */
  function highlightItem(index: number) {
    const item = document.querySelector(`[data-index="${index}"]`);
    if (item) {
      // Mark the item as the active descendant of the input.
      const input = document.getElementById(`${id}-input`) as HTMLElement;
      setAttribute(input, "aria-activedescendant", `${id}-descendent-${index}`);
      // Set the data-highlighted attribute on the item.
      setAttribute(item, "data-highlighted");
      // If the item isn't already visible, scroll it into view.
      item.scrollIntoView({ block: scrollAlignment });
    }
  }

  const list: Action<HTMLUListElement> = (node) => {
    /**
     * Iterates over visible items and ensures that `data-index`
     * and `id` attributes represent their position in the list.
     */
    function updateItemIndices() {
      const items = node.querySelectorAll("[data-list-item]");
      itemCount.set(items.length);
      items.forEach((item, i) => {
        setAttribute(item, "data-index", i);
        setAttribute(item, "id", `${id}-descendent-${i}`);
      });
    }

    /**
     * Trigger an update when the component mounts and listen for
     * future "update" events. This happens when the list is filtered
     * or the items change.
     */
    updateItemIndices();
    const unsubscribe = emitter.on("update", updateItemIndices);

    return {
      destroy: () => unsubscribe(),
    };
  };

  const listItem: Action<HTMLLIElement> = (node) => {
    setAttribute(node, "data-list-item");

    function onMouseEnter() {
      const { index } = node.dataset;
      if (index) {
        highlightItem(parseInt(index, 10));
      }
    }

    function unHighlightItem() {
      node.removeAttribute("data-highlighted");
    }

    function onClick() {
      const { index } = node.dataset;
      if (index) {
        const parsedIndex = parseInt(index, 10);
        setSelectedItem(
          parsedIndex,
          document.getElementById(`${id}-input`) as HTMLInputElement
        );
        document.getElementById(`${id}-input`)?.focus();
        close();
      }
    }

    function onMouseDown() {
      trapFocus = true;
    }

    function onMouseUp() {
      trapFocus = false;
    }

    const cleanup = groupListeners(
      addEventListener(node, "mouseenter", onMouseEnter),
      addEventListener(node, "mouseleave", unHighlightItem),
      addEventListener(node, "mousedown", onMouseDown),
      addEventListener(document, "mouseup", onMouseUp),
      addEventListener(node, "click", onClick)
    );

    return {
      destroy: () => {
        cleanup();
      },
    };
  };

  const filterInput: Action<HTMLInputElement> = (node) => {
    function removeHighlight() {
      const item = document.querySelector<HTMLElement>(`[data-highlighted]`);
      if (item) {
        item.removeAttribute("data-highlighted");
        const { index } = item.dataset;
        if (index) {
          return parseInt(index, 10);
        }
      }
      return -1;
    }

    /**
     * Handles all keyboard events when the input is focused.
     */
    function handleKeydown(e: KeyboardEvent) {
      // Handle key events when the menu is closed.
      if (!store$.isOpen) {
        // The user presses `esc`. The input should be cleared and lose focus.
        if (e.key === keyboardKeys.Escape) {
          node.blur();
          node.value = "";
          return;
        }
        /**
         * If the user presses one of the interaction keys, return
         * early so that the other key events aren't fired.
         */
        if (interactionKeys.has(e.key)) {
          return;
        }
        // Don't open the menu on backspace if the input is blank.
        if (e.key === keyboardKeys.Backspace && node.value === "") {
          return;
        }
        // Otherwise, open the input.
        open();
      }

      // Handle key events when the menu is open.
      switch (e.key) {
        case keyboardKeys.Escape: {
          close();
          break;
        }
        case keyboardKeys.Enter: {
          // @TODO handle non-selection callbacks.
          const { index } = (
            document.querySelector(`[data-highlighted]`) as HTMLElement
          ).dataset;
          if (index) {
            setSelectedItem(parseInt(index, 10), e.target as HTMLInputElement);
          }

          close();
          break;
        }
        case keyboardKeys.Home: {
          highlightItem(0);
          break;
        }
        case keyboardKeys.End: {
          const nextIndex = store$.itemCount - 1;
          highlightItem(nextIndex);
          break;
        }
        case keyboardKeys.PageUp: {
          const currentIndex = removeHighlight();
          const nextIndex = getNextIndex({
            currentIndex,
            itemCount: store$.itemCount,
            moveAmount: -10,
          });
          highlightItem(nextIndex);
          break;
        }
        case keyboardKeys.PageDown: {
          const currentIndex = removeHighlight();
          const nextIndex = getNextIndex({
            currentIndex,
            itemCount: store$.itemCount,
            moveAmount: 10,
          });
          highlightItem(nextIndex);
          break;
        }
        case keyboardKeys.ArrowDown: {
          const currentIndex = removeHighlight();
          const nextIndex = getNextIndex({
            currentIndex,
            itemCount: store$.itemCount,
            moveAmount: 1,
          });
          highlightItem(nextIndex);
          break;
        }
        case keyboardKeys.ArrowUp: {
          if (e.altKey) {
            close();
            return;
          }
          const currentIndex = removeHighlight();
          const nextIndex = getNextIndex({
            currentIndex,
            itemCount: store$.itemCount,
            moveAmount: -1,
          });
          highlightItem(nextIndex);
          break;
        }
      }
    }

    // @TODO: throttle this value
    function handleInput(e: Event) {
      const value = (e.target as HTMLInputElement).value;
      inputValue.set(value);
      filterFunction(value);
      emitter.emit("update");
    }

    const cleanup = groupListeners(
      addEventListener(node, "blur", close),
      addEventListener(node, "focus", open),
      addEventListener(node, "keydown", handleKeydown),
      addEventListener(node, "input", handleInput)
    );

    return {
      destroy: () => {
        cleanup();
      },
    };
  };

  return {
    inputValue: readonly(inputValue),
    selectedItem: readonly(selectedItem),
    isOpen: readonly(isOpen),
    filterInput,
    filterInputAttributes,
    labelAttributes,
    listAttributes,
    list,
    listItem,
  };
}
