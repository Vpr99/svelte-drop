<script lang="ts">
  import { writable } from "svelte/store";
  import { createCombobox } from "$lib/index.js";

  const books = [
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
  ];

  const items = writable(books);

  function getBooksFilter(inputValue: string) {
    const lowerCasedInputValue = inputValue.toLowerCase();

    return function booksFilter(book: any) {
      return (
        !inputValue ||
        book.title.toLowerCase().includes(lowerCasedInputValue) ||
        book.author.toLowerCase().includes(lowerCasedInputValue)
      );
    };
  }

  const {
    isOpen,
    filterInput,
    labelAttributes,
    listAttributes,
    filterInputAttributes,
    highlightedIndex,
    selectedItem,
    getItemProps,
    listItem,
  } = createCombobox({
    items,
    filterFunction(value) {
      items.set(books.filter(getBooksFilter(value)));
    },
    itemToString(item) {
      return item ? item.title : "";
    },
  });
</script>

<div>
  <div class="container">
    <label {...labelAttributes}>
      Choose your favorite book:

      <div class="search-box">
        <input
          use:filterInput
          {...$filterInputAttributes}
          placeholder="Best book ever"
          class="input"
        />
        <!-- We must output these at HTML ASCII characters in order for them to render -->
        {$isOpen ? "⬆️" : "⬇️"}
      </div>
    </label>
  </div>
  <ul
    style:--status={!($isOpen && $items.length) ? "visible" : "visible"}
    class="list"
    {...listAttributes}
  >
    {#if $isOpen}
      {#each $items as item, index (index)}
        <li
          use:listItem
          class="item"
          style:--font-weight={$selectedItem === item ? "700" : "400"}
          style:--background-color={$highlightedIndex === index
            ? "#eee"
            : "transparent"}
          {...getItemProps(index)}
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
