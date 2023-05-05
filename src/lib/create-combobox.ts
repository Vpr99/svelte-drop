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
 * ...........
 * @TODO investigate passing back attribute values directly instead of using readable stores
 */
export function createCombobox<T extends Item>(
  props: ComboboxProps<T>
): Combobox {
  const id = nanoid();
  const isOpen = writable(false);
  const highlightedIndex = writable(-1);

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
    isOpen.set(false);
  }

  // Open the menu and focus the input.
  function open() {
    isOpen.set(true);
    document?.getElementById(`${id}-input`)?.focus();
  }

  function getItemProps(index: number) {
    return {
      id: `${id}-descendent-${index}`,
    };
  }

  const filterInput: Action<HTMLInputElement, void> = (node) => {
    node.addEventListener("blur", close);
    node.addEventListener("focus", open);
    node.addEventListener("keydown", handleKeydown);

    return {
      destroy: () => {
        node.removeEventListener("keydown", handleKeydown);
        node.removeEventListener("blur", close);
        node.removeEventListener("focus", open);
      },
    };
  };

  const triggerButton: Action<HTMLButtonElement, void> = (node) => {
    node.addEventListener("click", toggle);

    return {
      destroy: () => {
        node.removeEventListener("click", toggle);
      },
    };
  };

  function handleKeydown(e: KeyboardEvent) {
    if (!$store.isOpen) {
      return;
    }

    if (e.key === "Escape") {
      close();
      // @TODO figure out why this hack is required.
      (e.target as HTMLElement).blur();
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
        // @TODO is this the right place for side-effects?
        document
          .getElementById(`${id}-descendent-${nextIndex}`)
          ?.scrollIntoView(false);
        return nextIndex;
      });
    }
  }

  return {
    isOpen: readonly(isOpen),
    filterInput,
    triggerButton,
    triggerButtonAttributes,
    filterInputAttributes,
    listAttributes,
    labelAttributes,
    highlightedIndex: readonly(highlightedIndex),
    getItemProps,
  };
}

/*
What does our combox do to start?

- [x] closed by default
- [x] has to accept an array of generics 
- [x] infer the generic
- [?] must be accessible
- [?] Do we want this to be controlled or uncontrolled? (TBD- I think controlled)
- [ ] must be filterable
- 
*/
