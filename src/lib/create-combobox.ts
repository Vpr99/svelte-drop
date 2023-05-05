import type { Action } from "svelte/action";
import { writable, type Writable } from "svelte/store";

type Item = Record<string, unknown>;
interface ComboboxProps<T extends Item> {
  items: T[];
}

interface Combobox {
  isOpen: Writable<boolean>;
  filterInput: Action<HTMLInputElement, void>;
  triggerButton: Action<HTMLButtonElement, void>;
}

/**
 * minimumest viable combobox
 * [X] it has a trigger and a list
 * [X] when you click the trigger, it opens the list
 * [ ] when you click elsewhere, it closes the list
 * ...........
 */
export function createCombobox<T extends Item>(
  props: ComboboxProps<T>
): Combobox {
  const isOpen = writable(false);

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
    return {
      destroy: () => {
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

  return {
    isOpen,
    filterInput,
    triggerButton,
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
