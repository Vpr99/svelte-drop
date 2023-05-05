import { writable, type Writable } from "svelte/store";

type Item = Record<string, unknown>;
interface ComboboxProps<T extends Item> {
  items: T[];
}

interface Combobox {
  isOpen: Writable<boolean>;
  toggleButton: () => void;
}

/**
 * minimumest viable combobox
 * it has a trigger and a list
 * when you click the trigger, it opens the list
 * when you click elsewhere, it closes the list
 * ...........
 */
export function createCombobox<T extends Item>(
  props: ComboboxProps<T>
): Combobox {
  const isOpen = writable(false);
  return {
    isOpen,
    toggleButton: () => isOpen.update((value) => !value),
  };
}

/*
What does our combox do to start?

- closed by default
- has to accept an array of generics 
- infer the generic
- must be accessible
- Do we want this to be controlled or uncontrolled? (TBD- I think controlled)
- must be filterable
- 
*/
