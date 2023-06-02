import type { Action } from "svelte/action";
import {
  writable,
  type Readable,
  type Writable,
  derived,
  readonly,
} from "svelte/store";
import {
  getNextIndex,
  interactionKeys,
  keyboardKeys,
  addEventListener,
  groupListeners,
} from "./utils.js";
import { nanoid } from "nanoid";
import type {
  HTMLAttributes,
  HTMLInputAttributes,
  HTMLLabelAttributes,
  HTMLLiAttributes,
} from "svelte/elements";

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
  filterInput: Action<HTMLInputElement, void>;
  listItem: Action<HTMLLIElement, void>;
  // @TODO: support OL, DL, div, nav, etc
  list: Action<HTMLUListElement, { inputValue: string; isOpen: boolean }>;
  filterInputAttributes: Readable<HTMLInputAttributes>;
  labelAttributes: HTMLLabelAttributes;
  listAttributes: HTMLAttributes<
    HTMLUListElement | HTMLOListElement | HTMLDListElement
  >;
  highlightedIndex: Readable<number>;
  selectedItem: Readable<T>;
  getItemProps: (index: number) => HTMLLiAttributes;
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
  const highlightedIndex = writable(-1);
  let trapFocus = false;
  const inputValue = writable("");

  const labelAttributes = {
    id: `${id}-label`,
    for: `${id}-input`,
  };

  const listAttributes = {
    id: `${id}-menu`,
    role: "listbox",
  };

  let $store: {
    isOpen: boolean;
    highlightedIndex: number;
    items: T[];
  };

  const state = derived(
    [isOpen, highlightedIndex, items],
    ([isOpen, highlightedIndex, items]) => ({ isOpen, highlightedIndex, items })
  );

  // @TODO: unsure if we need to unsubscribe from this value when the component using `createCombobox` is unmounted
  state.subscribe((value) => {
    $store = value;
  });

  // @TODO change name?
  // @TODO add `satisfies` maybe?
  const filterInputAttributes = derived(
    [isOpen, highlightedIndex],
    ([isOpen, highlightedIndex]) =>
      ({
        "aria-autocomplete": "list",
        "aria-controls": `${id}-menu`,
        "aria-expanded": isOpen,
        "aria-labelledby": `${id}-label`,
        "aria-activedescendant":
          highlightedIndex > -1 ? `${id}-descendent-${highlightedIndex}` : "",
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

  function getItemProps(index: number) {
    return {
      id: `${id}-descendent-${index}`,
      "data-list-item": "data-list-item",
      "data-index": index,
    };
  }

  function setSelectedItem(index: number, input: HTMLInputElement | null) {
    const string = itemToString($store.items[index]);
    selectedItem.set($store.items[index]);

    // @TODO: think through if this should be a required argument (aka: internally handled or always externally managed (or both))
    selectItem && selectItem($store.items[index]);
    filterFunction(string);

    if (input) {
      input.value = string;
    }
  }

  const list: Action<
    HTMLUListElement,
    {
      inputValue: string;
      isOpen: boolean;
    }
  > = (node) => {
    function checkList() {
      // node is always the same
      const length = node.querySelectorAll("[data-list-item]").length;

      itemCount.set(length);
    }

    checkList();

    return {
      update: () => checkList(),
      destroy: () => undefined,
    };
  };

  const listItem: Action<HTMLLIElement, void> = (node) => {
    // @TODO figure out its own position in the list (node.parentElement.children[]...?)
    function highlightItem() {
      const { index } = node.dataset;
      if (index) {
        const parsedIndex = parseInt(index, 10);
        if (parsedIndex !== $store.highlightedIndex) {
          node.setAttribute("data-highlighted", "data-highlighted");
        }
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
      addEventListener(node, "mouseenter", highlightItem),
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

  const filterInput: Action<HTMLInputElement, void> = (node) => {
    function scrollToItem(index: number) {
      const el = document.getElementById(`${id}-descendent-${index}`);
      if (el) {
        el.scrollIntoView({ block: scrollAlignment });
      }
    }

    function handleKeydown(e: KeyboardEvent) {
      // Handle key events when the menu is closed.
      if (!$store.isOpen) {
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
          setSelectedItem(
            $store.highlightedIndex,
            e.target as HTMLInputElement
          );
          close();
          break;
        }
        case keyboardKeys.Home: {
          highlightedIndex.set(0);
          scrollToItem(0);
          break;
        }
        case keyboardKeys.End: {
          const nextIndex = $store.items.length - 1;
          highlightedIndex.set(nextIndex);
          scrollToItem(nextIndex);
          break;
        }
        case keyboardKeys.PageUp: {
          highlightedIndex.update((index) => {
            const nextIndex = getNextIndex({
              currentIndex: index,
              itemCount: $store.items.length,
              moveAmount: -10,
            });
            scrollToItem(nextIndex);
            return nextIndex;
          });
          break;
        }
        case keyboardKeys.PageDown: {
          highlightedIndex.update((index) => {
            const nextIndex = getNextIndex({
              currentIndex: index,
              itemCount: $store.items.length,
              moveAmount: 10,
            });
            scrollToItem(nextIndex);
            return nextIndex;
          });
          break;
        }
        case keyboardKeys.ArrowDown: {
          highlightedIndex.update((index) => {
            const nextIndex = getNextIndex({
              currentIndex: index,
              itemCount: $store.items.length,
              moveAmount: 1,
            });
            scrollToItem(nextIndex);
            return nextIndex;
          });
          break;
        }
        case keyboardKeys.ArrowUp: {
          if (e.altKey) {
            close();
            return;
          }
          highlightedIndex.update((index) => {
            const nextIndex = getNextIndex({
              currentIndex: index,
              itemCount: $store.items.length,
              moveAmount: -1,
            });
            scrollToItem(nextIndex);
            return nextIndex;
          });
          break;
        }
      }
    }

    // @TODO: throttle this value
    function handleInput(e: Event) {
      const value = (e.target as HTMLInputElement).value;
      inputValue.set(value);
      filterFunction(value);
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
    highlightedIndex: readonly(highlightedIndex),
    isOpen: readonly(isOpen),
    filterInput,
    filterInputAttributes,
    getItemProps,
    labelAttributes,
    listAttributes,
    list,
    listItem,
  };
}
