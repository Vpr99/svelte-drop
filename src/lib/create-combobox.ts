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
  setAttribute,
} from "./utils.js";
import { nanoid } from "nanoid";
import type {
  HTMLAttributes,
  HTMLInputAttributes,
  HTMLLabelAttributes,
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
  list: Action<HTMLUListElement, void>;
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
  let listUpdated: CustomEvent<{ id: string }>;

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
    itemCount: number;
    items: T[];
  };

  const state = derived(
    [isOpen, itemCount, items],
    ([isOpen, itemCount, items]) => ({ isOpen, itemCount, items })
  );

  // @TODO: unsure if we need to unsubscribe from this value when the component using `createCombobox` is unmounted
  state.subscribe((value) => {
    $store = value;
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

    // document.dispatchEvent(listUpdated);
  }

  // Open the menu and focus the input.
  function open() {
    isOpen.set(true);
    document?.getElementById(`${id}-input`)?.focus();
    document.dispatchEvent(listUpdated);
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

  const list: Action<HTMLUListElement> = (node) => {
    listUpdated = new CustomEvent("list:update", { detail: { id } });

    function checkList(e: Event) {
      // due to the possibilty of having multiple comboboxes, we need to ensure the custom event
      // that was fired matches the id on this instance of the combobox
      if ((e as CustomEvent<{ id: string }>).detail.id !== id) {
        return;
      }

      const listItems = node.querySelectorAll("[data-list-item]");
      listItems.forEach((el, i) => {
        setAttribute(el, "data-index", i);
        setAttribute(el, "id", `${id}-descendent-${i}`);
      });

      itemCount.set(listItems.length);
    }

    document.addEventListener("list:update", checkList);

    return {
      destroy: () => {
        document.removeEventListener("list:update", checkList);
      },
    };
  };

  const listItem: Action<HTMLLIElement, void> = (node) => {
    setAttribute(node, "data-list-item");

    function highlightItem() {
      document
        .querySelector(`[data-highlighted]`)
        ?.removeAttribute("data-highlighted");
      const { index } = node.dataset;
      if (index) {
        setAttribute(node, "data-highlighted");
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
    function removeHighlight() {
      const item = document.querySelector(`[data-highlighted]`) as HTMLElement;

      if (item) {
        item.removeAttribute("data-highlighted");
        const { index } = item.dataset;

        if (index) {
          return parseInt(index, 10);
        }
      }
      return -1;
    }

    // @TODO set activedescendant on the input.
    // "aria-activedescendant":
    // highlightedIndex > -1 ? `${id}-descendent-${highlightedIndex}` : "",
    function scrollToItem(index: number) {
      const el = document.querySelector(`[data-index="${index}"]`);
      if (el) {
        setAttribute(el, "data-highlighted");
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
          const highlit = document.querySelector(`[data-highlighted]`);
          const index = highlit?.dataset.index;
          setSelectedItem(index, e.target as HTMLInputElement);
          close();
          break;
        }
        case keyboardKeys.Home: {
          scrollToItem(0);
          break;
        }
        case keyboardKeys.End: {
          const nextIndex = $store.itemCount - 1;
          scrollToItem(nextIndex);
          break;
        }
        case keyboardKeys.PageUp: {
          const previousHightlightedIndex = removeHighlight();
          const nextIndex = getNextIndex({
            currentIndex: previousHightlightedIndex,
            itemCount: $store.itemCount,
            moveAmount: -10,
          });
          scrollToItem(nextIndex);
          break;
        }
        case keyboardKeys.PageDown: {
          const previousHightlightedIndex = removeHighlight();
          const nextIndex = getNextIndex({
            currentIndex: previousHightlightedIndex,
            itemCount: $store.itemCount,
            moveAmount: 10,
          });
          scrollToItem(nextIndex);
          break;
        }
        case keyboardKeys.ArrowDown: {
          // figure out the currently highlighted item (if any)
          // we also need to remove that highlight
          // set the new hightlight based on the index

          const previousHightlightedIndex = removeHighlight();
          const nextIndex = getNextIndex({
            currentIndex: previousHightlightedIndex,
            itemCount: $store.itemCount,
            moveAmount: 1,
          });
          scrollToItem(nextIndex);
          break;
        }
        case keyboardKeys.ArrowUp: {
          if (e.altKey) {
            close();
            return;
          }
          const previousHightlightedIndex = removeHighlight();
          const nextIndex = getNextIndex({
            currentIndex: previousHightlightedIndex,
            itemCount: $store.itemCount,
            moveAmount: -1,
          });
          scrollToItem(nextIndex);
          break;
        }
      }
    }

    // @TODO: throttle this value
    function handleInput(e: Event) {
      const value = (e.target as HTMLInputElement).value;
      inputValue.set(value);
      filterFunction(value);

      document.dispatchEvent(listUpdated);
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
