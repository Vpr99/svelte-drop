import { createNanoEvents } from "nanoevents";
import { nanoid } from "nanoid";
import { tick } from "svelte";
import type { Action } from "svelte/action";
import type { HTMLInputAttributes, HTMLLabelAttributes } from "svelte/elements";
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
  chain,
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
  filterInput: Action<HTMLInputElement>;
  filterInputAttributes: Readable<HTMLInputAttributes>;
  inputValue: Readable<string>;
  isOpen: Readable<boolean>;
  labelAttributes: HTMLLabelAttributes;
  list: Action<HTMLElement>;
  listItem: Action<HTMLLIElement>;
  selectedItem: Readable<T>;
}

interface Events {
  highlightItem: (index: number) => void;
  update: () => void;
}

export function createCombobox<T>({
  items,
  scrollAlignment = "nearest",
  itemToString,
  filterFunction,
  selectItem,
}: ComboboxProps<T>): Combobox<T> {
  const emitter = createNanoEvents<Events>();
  const highlightedIndex = writable(-1);
  const id = nanoid(6);
  const inputValue = writable("");
  const isOpen = writable(false);
  const itemCount = writable(0);
  const selectedItem = writable<T>(undefined);
  let trapFocus = false;

  function getFilterInput() {
    return document.getElementById(`${id}-input`) as HTMLInputElement;
  }
  function getList() {
    return document.getElementById(`${id}-menu`) as HTMLElement;
  }

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

  const labelAttributes = {
    id: `${id}-label`,
    for: `${id}-input`,
  };

  const filterInputAttributes = derived(
    [isOpen, highlightedIndex],
    ([isOpen, highlightedIndex]): HTMLInputAttributes => ({
      "aria-autocomplete": "list",
      "aria-controls": `${id}-menu`,
      "aria-expanded": isOpen,
      "aria-labelledby": `${id}-label`,
      "aria-activedescendant":
        highlightedIndex > -1 ? `${id}-descendent-${highlightedIndex}` : "",
      autocomplete: "off",
      id: `${id}-input`,
      role: "combobox",
    })
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
    getFilterInput().focus();
  }

  function setSelectedItem(index: number) {
    const string = itemToString(store$.items[index]);
    selectedItem.set(store$.items[index]);

    // @TODO: think through if this should be a required argument (aka: internally handled or always externally managed (or both))
    selectItem && selectItem(store$.items[index]);
    filterFunction(string);

    getFilterInput().value = string;
  }

  const list: Action<HTMLUListElement> = (node) => {
    // Set some attributes on the list element.
    node.setAttribute("role", "listbox");
    node.setAttribute("id", `${id}-menu`);

    /**
     * Highlights an item in the list by index. This can
     * either occur on mouseenter or via keyboard input.
     * @param index array index of the item to highlight.
     */
    function highlightItem(index: number) {
      // First, set the index in the writable store.
      highlightedIndex.set(index);
      // Then iterate over all items and mark the one at the selected index.
      node.querySelectorAll("[data-list-item]").forEach((item, i) => {
        if (i === index) {
          setAttribute(item, "data-highlighted");
          // If the item isn't already visible, scroll it into view.
          item.scrollIntoView({ block: scrollAlignment });
        } else {
          // Remove the data-highlighted attribute from all others.
          item.removeAttribute("data-highlighted");
        }
      });
    }

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
     * updates when the list is filtered or the items change.
     */
    updateItemIndices();
    const unsubscribe = chain(
      emitter.on("update", updateItemIndices),
      emitter.on("highlightItem", highlightItem)
    );

    return {
      destroy: () => {
        unsubscribe();
      },
    };
  };

  const listItem: Action<HTMLLIElement> = (node) => {
    // Set the `data-list-item` attribute on all list items.
    setAttribute(node, "data-list-item");

    function onMouseUp() {
      trapFocus = false;
    }

    function onMouseDown() {
      trapFocus = true;
    }

    function onClick() {
      if (node.dataset.index) {
        setSelectedItem(parseInt(node.dataset.index, 10));
        getFilterInput().focus();
        close();
      }
    }

    function onMouseEnter() {
      if (node.dataset.index) {
        emitter.emit("highlightItem", parseInt(node.dataset.index, 10));
      }
    }

    function onMouseLeave() {
      emitter.emit("highlightItem", -1);
    }

    const cleanup = chain(
      addEventListener(document, "mouseup", onMouseUp),
      addEventListener(node, "mousedown", onMouseDown),
      addEventListener(node, "click", onClick),
      addEventListener(node, "mouseenter", onMouseEnter),
      addEventListener(node, "mouseleave", onMouseLeave)
    );

    return {
      destroy: () => {
        cleanup();
      },
    };
  };

  const filterInput: Action<HTMLInputElement> = (node) => {
    /**
     * Returns the index of the currently highlighted
     * item or -1 if no item is highlighted.
     */
    function getHighlightedIndex() {
      const item = getList().querySelector<HTMLElement>("[data-highlighted]");
      return item?.dataset.index ? parseInt(item.dataset.index, 10) : -1;
    }

    // Handles all keyboard events when the input is focused.
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
          /**
           * @TODO handle non-selection callbacks.
           * @FIXME scope the querySelector to the list.
           */
          const { index } = (
            document.querySelector(`[data-highlighted]`) as HTMLElement
          ).dataset;
          if (index) {
            setSelectedItem(parseInt(index, 10));
          }

          close();
          break;
        }
        case keyboardKeys.Home: {
          emitter.emit("highlightItem", 0);
          break;
        }
        case keyboardKeys.End: {
          const nextIndex = store$.itemCount - 1;
          emitter.emit("highlightItem", nextIndex);
          break;
        }
        case keyboardKeys.PageUp: {
          const currentIndex = getHighlightedIndex();
          const nextIndex = getNextIndex({
            currentIndex,
            itemCount: store$.itemCount,
            moveAmount: -10,
          });
          emitter.emit("highlightItem", nextIndex);
          break;
        }
        case keyboardKeys.PageDown: {
          const currentIndex = getHighlightedIndex();
          const nextIndex = getNextIndex({
            currentIndex,
            itemCount: store$.itemCount,
            moveAmount: 10,
          });
          emitter.emit("highlightItem", nextIndex);
          break;
        }
        case keyboardKeys.ArrowDown: {
          const currentIndex = getHighlightedIndex();
          const nextIndex = getNextIndex({
            currentIndex,
            itemCount: store$.itemCount,
            moveAmount: 1,
          });
          emitter.emit("highlightItem", nextIndex);
          break;
        }
        case keyboardKeys.ArrowUp: {
          if (e.altKey) {
            close();
            return;
          }
          const currentIndex = getHighlightedIndex();
          const nextIndex = getNextIndex({
            currentIndex,
            itemCount: store$.itemCount,
            moveAmount: -1,
          });
          emitter.emit("highlightItem", nextIndex);
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

    const cleanup = chain(
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
    list,
    listItem,
  };
}
