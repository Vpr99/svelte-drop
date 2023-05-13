import type { Action } from "svelte/action";
import {
  writable,
  type Readable,
  type Writable,
  derived,
  readonly,
} from "svelte/store";
import { getNextIndex, interactionKeys, keyboardKeys } from "./utils.js";
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
  filterInputAttributes: Readable<HTMLInputAttributes>;
  labelAttributes: HTMLLabelAttributes;
  listAttributes: HTMLAttributes<
    HTMLUListElement | HTMLOListElement | HTMLDListElement
  >;
  highlightedIndex: Readable<number>;
  selectedItem: Readable<T>;
  getItemProps: (index: number) => HTMLLiAttributes;
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
  const highlightedIndex = writable(-1);
  let trapFocus = false;

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
    ([isOpen, highlightedIndex, items]) => ({
      isOpen,
      highlightedIndex,
      items,
    })
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

  const listItem: Action<HTMLLIElement, void> = (node) => {
    function highlightItem() {
      const { index } = node.dataset;
      if (index) {
        const parsedIndex = parseInt(index, 10);
        if (parsedIndex !== $store.highlightedIndex) {
          highlightedIndex.set(parsedIndex);
        }
      }
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

    const controller = new AbortController();
    node.addEventListener("mouseenter", highlightItem, {
      signal: controller.signal,
    });
    node.addEventListener("mousedown", onMouseDown, {
      signal: controller.signal,
    });
    document.addEventListener("mouseup", onMouseUp, {
      signal: controller.signal,
    });
    node.addEventListener("click", onClick, {
      signal: controller.signal,
    });
    return {
      destroy: () => {
        controller.abort();
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
      /**
       * There are a couple cases to handle if the menu is closed:
       */
      if (!$store.isOpen) {
        if (interactionKeys.has(e.key)) {
          return;
        }
        if (e.key === keyboardKeys.Escape) {
          document.getElementById(`${id}-input`)?.blur();
          // @TODO clear the input value.
          return;
        }
        open();
      }
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
      filterFunction(value);
    }

    const controller = new AbortController();
    node.addEventListener("blur", close, { signal: controller.signal });
    node.addEventListener("focus", open, { signal: controller.signal });
    node.addEventListener("keydown", handleKeydown, {
      signal: controller.signal,
    });
    node.addEventListener("input", handleInput, {
      signal: controller.signal,
    });

    return {
      destroy: () => {
        controller.abort();
      },
    };
  };

  return {
    filterInput,
    filterInputAttributes,
    getItemProps,
    selectedItem: readonly(selectedItem),
    highlightedIndex: readonly(highlightedIndex),
    isOpen: readonly(isOpen),
    labelAttributes,
    listAttributes,
    listItem,
  };
}
