<script lang="ts">
  import { writable } from "svelte/store";

  const items = writable([
    { author: "Harper Lee", title: "To Kill a Mockingbird" },
    { author: "Lev Tolstoy", title: "War and Peace" },
    { author: "Fyodor Dostoyevsy", title: "The Idiot" },
    { author: "Oscar Wilde", title: "A Picture of Dorian Gray" },
    { author: "George Orwell", title: "1984" },
    { author: "Jane Austen", title: "Pride and Prejudice" },
    { author: "Marcus Aurelius", title: "Meditations" },
    { author: "Fyodor Dostoevsky", title: "The Brothers Karamazov" },
    { author: "Lev Tolstoy", title: "Anna Karenina" },
    { author: "Fyodor Dostoevsky", title: "Crime and Punishment" },
  ]);

  function getBooksFilter(inputValue) {
    const lowerCasedInputValue = inputValue.toLowerCase();

    return function booksFilter(book) {
      return (
        !inputValue ||
        book.title.toLowerCase().includes(lowerCasedInputValue) ||
        book.author.toLowerCase().includes(lowerCasedInputValue)
      );
    };
  }

  const {
    isOpen,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
  } = useCombobox({
    onInputValueChange({ inputValue }) {
      items.update((value) => value.filter(getBooksFilter(inputValue)));
    },
    $items,
    itemToString(item) {
      return item ? item.title : "";
    },
  });
</script>

<div>
  <div class="container">
    <label class="label" {...getLabelProps()}>Choose your favorite book:</label>

    <div class="search-box">
      <input placeholder="Best book ever" class="input" {...getInputProps()} />
      <button
        aria-label="toggle menu"
        class="button"
        type="button"
        {...getToggleButtonProps()}
      >
        <!-- We must output these at HTML ASCII characters in order for them to render -->
        {isOpen ? "⬆️" : "⬇️"}
      </button>
    </div>
  </div>

  <ul
    style:--status={!(isOpen && $items.length) ? "hidden" : "visible"}
    class="list"
    {...getMenuProps()}
  >
    {#if isOpen}
      {#each $items as item, index (index)}
        <li
          style:--background-color={highlightedIndex === index
            ? "#eee"
            : "transparent"}
          style:--font-weight={selectedItem === item ? "700" : "400"}
          class="item"
          {...getItemProps({ item, index })}
        >
          <span>{item.title}</span>

          <span class="item-author">{item.author}</span>
        </li>
      {/each}
    {/if}
  </ul>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 18rem;
  }

  .label {
    width: fit-content;
  }

  .search-box {
    background: white;
    display: flex;
    filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))
      drop-shadow(0 2px 2px rgb(0 0 0 / 0.06));
    gap: 0.125rem;
  }

  .input {
    padding: 0.375rem;
    width: 100%;
  }

  .button {
    padding: 0 0.5rem;
  }

  .list {
    background: white;
    margin: 0.25rem 0 0;
    max-height: 20rem;
    overflow: scroll;
    padding: 0;
    position: absolute;
    visibility: var(--status, "hidden");
    width: 18rem;
  }

  .item {
    background-color: var(--background-color, transparent);
    display: flex;
    flex-direction: column;
    font-weight: var(--font-weight, 400);
    padding: 0.5rem 0.75rem;
  }

  .item-author {
    color: #555;
    font-size: 0.75em;
  }
</style>
