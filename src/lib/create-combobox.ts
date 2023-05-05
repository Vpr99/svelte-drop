import type { Action } from "svelte/action";
import { writable, type Writable, type Readable, derived } from "svelte/store";
import { nanoid } from "nanoid";
import type {
  HTMLAttributes,
  HTMLButtonAttributes,
  HTMLInputAttributes,
  HTMLLabelAttributes,
} from "svelte/elements";

type Item = Record<string, unknown>;
interface ComboboxProps<T extends Item> {
  items: T[];
}

interface Combobox {
  isOpen: Writable<boolean>;
  filterInput: Action<HTMLInputElement, void>;
  triggerButton: Action<HTMLButtonElement, void>;
  triggerButtonAttributes: Readable<HTMLButtonAttributes>;
  filterInputAttributes: Readable<HTMLInputAttributes>;
  labelAttributes: HTMLLabelAttributes;
  // @TODO add OL, DL, nav???
  listAttributes: HTMLAttributes<HTMLUListElement>;
  highlightedIndex: Writable<number>;
}

/**
 * minimumest viable combobox
 * [X] it has a trigger and a list
 * [X] when you click the trigger, it opens the list
 * [X] when you click elsewhere, it closes the list
 * [X] clicking the button should focus the input (ish)
 * [X] up/down should be bound
 * [ ] Label + other accessibility stuff
 * ...........
 * @TODO make `isOpen` not writable from the outside.
 * @TODO scroll down to an item when it's highlighted
 * @TODO investigate passing back attribute values directly instead of using readable stores
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

  // @TODO change name?
  // @TODO add `satisfies` maybe?
  // @TODO active descendant
  const filterInputAttributes = derived(
    isOpen,
    (isOpen) =>
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

  function toggle() {
    isOpen.update((value) => !value);
  }

  function focusInput(e: MouseEvent) {
    // TODO change this to a getElementById beacuse there might be more than 1 input as a sibling.
    (e.target as HTMLElement).parentElement?.querySelector("input")?.focus();
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
    node.addEventListener("click", focusInput);

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
      close();
      // @TODO figure out why this hack is required.
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
    filterInputAttributes,
    listAttributes,
    labelAttributes,
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
