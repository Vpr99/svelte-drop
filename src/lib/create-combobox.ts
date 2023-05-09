import type { Action } from "svelte/action";
import { writable, type Readable, derived, readonly } from "svelte/store";
import { getNextIndex } from "./utils.js";
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
}

interface Combobox {
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
 * [ ] Disabled list items (skip highlighting, etc.)
 * [ ] Item selection
 * [ ] `esc` keybind to (1) close the menu and (2) then clear the input.
 */
export function createCombobox<T extends Item>(
  props: ComboboxProps<T>
): Combobox {
  const id = nanoid(6);
  const isOpen = writable(false);
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

  function onButtonMouseDown() {
    trapFocus = true;
  }

  function onButtonMouseUp() {
    trapFocus = false;
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

    const controller = new AbortController();
    node.addEventListener("mousemove", highlightItem, {
      signal: controller.signal,
    });
    return {
      destroy: () => {
        controller.abort();
      },
    };
  };

  const filterInput: Action<HTMLInputElement, void> = (el) => {
    const controller = new AbortController();
    el.addEventListener("blur", close, { signal: controller.signal });
    el.addEventListener("focus", open, { signal: controller.signal });
    el.addEventListener("click", open, { signal: controller.signal });
    el.addEventListener("keydown", handleKeydown, {
      signal: controller.signal,
    });

    return {
      destroy: () => {
        controller.abort();
      },
    };
  };

  /**
   * @FIXME clicking the trigger button when the menu is open closes and
   * re-opens it. Probably because of the blur event on the input?
   */
  const triggerButton: Action<HTMLButtonElement, void> = (node) => {
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

  function handleKeydown(e: KeyboardEvent) {
    if (!$store.isOpen && e.key !== "Escape") {
      open();
    }

    if (e.key === "Escape") {
      close();
      // @TODO figure out why this hack is required.
      // (e.target as HTMLElement).blur();
    }
    if (e.key === "Home") {
      highlightedIndex.set(0);
      // @TODO is this the right place for side-effects?
      document.getElementById(`${id}-descendent-0`)?.scrollIntoView(false);
    }
    if (e.key === "End") {
      const index = props.items.length - 1;
      highlightedIndex.set(index);
      // @TODO is this the right place for side-effects?
      document
        .getElementById(`${id}-descendent-${index}`)
        ?.scrollIntoView(false);
    }
    if (e.key === "PageUp") {
      highlightedIndex.update((index) => {
        const nextIndex = getNextIndex({
          currentIndex: index,
          itemCount: props.items.length,
          moveAmount: -10,
        });
        // @TODO is this the right place for side-effects?
        document
          .getElementById(`${id}-descendent-${nextIndex}`)
          ?.scrollIntoView(false);
        return nextIndex;
      });
    }
    if (e.key === "PageDown") {
      highlightedIndex.update((index) => {
        const nextIndex = getNextIndex({
          currentIndex: index,
          itemCount: props.items.length,
          moveAmount: 10,
        });
        // @TODO is this the right place for side-effects?
        document
          .getElementById(`${id}-descendent-${nextIndex}`)
          ?.scrollIntoView(false);
        return nextIndex;
      });
    }
    if (e.key === "ArrowDown") {
      highlightedIndex.update((index) => {
        const nextIndex = getNextIndex({
          currentIndex: index,
          itemCount: props.items.length,
          moveAmount: 1,
        });
        // @TODO is this the right place for side-effects?
        document
          .getElementById(`${id}-descendent-${nextIndex}`)
          ?.scrollIntoView(false);
        return nextIndex;
      });
    }
    if (e.key === "ArrowUp") {
      highlightedIndex.update((index) => {
        const nextIndex = getNextIndex({
          currentIndex: index,
          itemCount: props.items.length,
          moveAmount: -1,
        });
        // @FIXME: pressing up from the bottom of the list shouldn't scroll until the selection reaches the top.
        // @TODO is this the right place for side-effects?
        document
          .getElementById(`${id}-descendent-${nextIndex}`)
          ?.scrollIntoView(false);
        return nextIndex;
      });
    }
  }

  return {
    filterInput,
    filterInputAttributes,
    getItemProps,
    highlightedIndex: readonly(highlightedIndex),
    isOpen: readonly(isOpen),
    labelAttributes,
    listAttributes,
    listItem,
    triggerButton,
    triggerButtonAttributes,
  };
}
