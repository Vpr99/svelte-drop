import type { Action } from "svelte/action";
import { writable, type Writable, type Readable, derived } from "svelte/store";
import { nanoid } from "nanoid";
import type { HTMLButtonAttributes } from "svelte/elements";

type Item = Record<string, unknown>;
interface ComboboxProps<T extends Item> {
  items: T[];
}

interface Combobox {
  isOpen: Writable<boolean>;
  filterInput: Action<HTMLInputElement, void>;
  triggerButton: Action<HTMLButtonElement, void>;
  triggerButtonAttributes: Readable<HTMLButtonAttributes>;
  highlightedIndex: Writable<number>;
}

/**
 * minimumest viable combobox
 * [X] it has a trigger and a list
 * [X] when you click the trigger, it opens the list
 * [ ] when you click elsewhere, it closes the list
 * [ ] clicking the button should focus the input
 * [ ] up/down should be bound
 * ...........
 * @TODO make `isOpen` not writable from the outside.
 * @TODO scroll down to an item when it's highlighted
 */
export function createCombobox<T extends Item>(
  props: ComboboxProps<T>
): Combobox {
  const id = nanoid();
  const isOpen = writable(false);
  const highlightedIndex = writable(-1);

  const $store = derived(
    [isOpen, highlightedIndex],
    ([isOpen, highlightedIndex]) => ({ isOpen, highlightedIndex })
  );

  //   <input placeholder="Best book ever" class="w-full p-1.5" aria-activedescendant="" aria-autocomplete="list" aria-controls="downshift-0-menu" aria-expanded="false" aria-labelledby="downshift-0-label" autocomplete="off" id="downshift-0-input" role="combobox" value="">
  // <button aria-label="toggle menu" class="px-2" type="button" aria-controls="downshift-0-menu" aria-expanded="false" id="downshift-0-toggle-button" tabindex="-1">↓</button>

  const triggerButtonAttributes = derived(isOpen, (isOpen) => ({
    "aria-expanded": isOpen,
    "aria-haspopup": true,
    id,
    tabIndex: "-1",
  }));

  function toggle() {
    isOpen.update((value) => !value);
  }

  function close() {
    isOpen.set(false);
  }

  function open() {
    isOpen.set(true);
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
    let state: any;
    const unsubscribe = $store.subscribe((value) => {
      state = value;
    });

    if (e.key === "Escape") {
      // @TODO figure out why this hack is required.
      close();
      (e.target as HTMLElement).blur();
    }

    if (e.key === "ArrowDown") {
      highlightedIndex.update((index) => {
        if (index === props.items.length - 1) {
          return 0;
        }
        return index + 1;
      });
    }

    if (e.key === "ArrowUp") {
      highlightedIndex.update((index) => {
        if (index === 0) {
          return props.items.length - 1;
        }
        return index - 1;
      });
    }
    // TODO: top -> bottom and bottom -> top
    unsubscribe();
  }

  return {
    isOpen,
    filterInput,
    triggerButton,
    triggerButtonAttributes,
    highlightedIndex,
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
