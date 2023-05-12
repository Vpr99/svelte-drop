import type { Action } from "svelte/action";
import { writable, type Readable, derived, readonly } from "svelte/store";
import { getNextIndex, interactionKeys, keyboardKeys } from "./utils.js";
import { nanoid } from "nanoid";
import type {
  HTMLAttributes,
  HTMLButtonAttributes,
  HTMLInputAttributes,
  HTMLLabelAttributes,
  HTMLLiAttributes,
} from "svelte/elements";

type Item = Record<string, unknown>;
interface ComboboxProps<T extends Item> {
  items: T[];
  /** @see https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView#block */
  scrollAlignment?: "nearest" | "center";
  itemToString: (item: T) => string;
  filterFunction: (value: string) => void;
  selectItem: (item: T) => void;
}

interface Combobox<T> {
  isOpen: Readable<boolean>;
  filterInput: Action<HTMLInputElement, void>;
  triggerButton: Action<HTMLButtonElement, void>;
  listItem: Action<HTMLLIElement, void>;
  triggerButtonAttributes: Readable<HTMLButtonAttributes>;
  filterInputAttributes: Readable<HTMLInputAttributes>;
  labelAttributes: HTMLLabelAttributes;
  listAttributes: HTMLAttributes<
    HTMLUListElement | HTMLOListElement | HTMLDListElement
  >;
  highlightedIndex: Readable<number>;
  selectedItem: Readable<T>;
  getItemProps: (index: number) => HTMLLiAttributes;
}

/**
 * minimumest viable combobox
 * [X] it has a trigger and a list
 * [X] when you click the trigger, it opens the list
 * [X] when you click elsewhere, it closes the list
 * [X] clicking the button should focus the input (ish)
 * [X] up/down should be bound
 * [X] Label + other accessibility stuff
 * [X] Keyboard navigation for pgup/pgdown/home/end
 * [X] scroll options
 * [ ] Disabled list items (skip highlighting, etc.)
 * [ ] Item selection
 * [ ] `esc` keybind to (1) close the menu and (2) then clear the input.
 */
export function createCombobox<T extends Item>({
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

  // @TODO change name?
  const triggerButtonAttributes = derived(isOpen, (isOpen) => ({
    "aria-controls": `${id}-menu`,
    "aria-expanded": isOpen,
    "aria-haspopup": true,
    id: `${id}-button`,
    tabIndex: "-1",
  }));

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
  };

  const state = derived(
    [isOpen, highlightedIndex],
    ([isOpen, highlightedIndex]) => ({
      isOpen,
      highlightedIndex,
    })
  );

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

  // Toggle menu visibility.
  function toggle() {
    isOpen.update((value) => !value);
    isOpen.subscribe((value) => {
      if (value === true) {
        document?.getElementById(`${id}-input`)?.focus();
      }
    });
  }

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
    const string = itemToString(items[index]);
    selectedItem.set(items[index]);

    selectItem(items[index]);
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
        el.scrollIntoView({
          block: scrollAlignment,
        });
      }
    }

    function handleKeydown(e: KeyboardEvent) {
      console.log("EE", e);

      if (!$store.isOpen && interactionKeys.has(e.key)) {
        // necessary to prevent the rest of this function from firing
        return;
      }

      if (!$store.isOpen) {
        open();
      }

      if (e.key === keyboardKeys.Escape) {
        close();
      }

      if (e.key === keyboardKeys.Enter) {
        setSelectedItem($store.highlightedIndex, e.target as HTMLInputElement);

        close();
      }

      if (e.key === keyboardKeys.Home) {
        highlightedIndex.set(0);
        scrollToItem(0);
      }
      if (e.key === keyboardKeys.End) {
        const nextIndex = items.length - 1;
        highlightedIndex.set(nextIndex);
        scrollToItem(nextIndex);
      }
      if (e.key === keyboardKeys.PageUp) {
        highlightedIndex.update((index) => {
          const nextIndex = getNextIndex({
            currentIndex: index,
            itemCount: items.length,
            moveAmount: -10,
          });
          scrollToItem(nextIndex);
          return nextIndex;
        });
      }
      if (e.key === keyboardKeys.PageDown) {
        highlightedIndex.update((index) => {
          const nextIndex = getNextIndex({
            currentIndex: index,
            itemCount: items.length,
            moveAmount: 10,
          });
          scrollToItem(nextIndex);
          return nextIndex;
        });
      }
      if (e.key === keyboardKeys.ArrowDown) {
        highlightedIndex.update((index) => {
          const nextIndex = getNextIndex({
            currentIndex: index,
            itemCount: items.length,
            moveAmount: 1,
          });
          scrollToItem(nextIndex);
          return nextIndex;
        });
      }
      if (e.key === keyboardKeys.ArrowUp) {
        if (e.altKey) {
          close();
        } else {
          highlightedIndex.update((index) => {
            const nextIndex = getNextIndex({
              currentIndex: index,
              itemCount: items.length,
              moveAmount: -1,
            });
            scrollToItem(nextIndex);
            return nextIndex;
          });
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

  const triggerButton: Action<HTMLButtonElement, void> = (node) => {
    function onButtonMouseDown() {
      trapFocus = true;
    }

    function onButtonMouseUp() {
      trapFocus = false;
    }

    const controller = new AbortController();
    node.addEventListener("click", toggle, { signal: controller.signal });
    node.addEventListener("mousedown", onButtonMouseDown, {
      signal: controller.signal,
    });

    // this is important in case the user moves their cursor off of the button and then releases the mouse click
    document.addEventListener("mouseup", onButtonMouseUp, {
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
    triggerButton,
    triggerButtonAttributes,
  };
}
