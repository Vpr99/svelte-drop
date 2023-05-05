<script lang="ts">
  import { writable } from 'svelte/store';

  const books = [
    {id: 1, author: 'Harper Lee', title: 'To Kill a Mockingbird'},
    {id: 2, author: 'Lev Tolstoy', title: 'War and Peace'},
    {id: 3, author: 'Fyodor Dostoyevsy', title: 'The Idiot'},
    {id: 4, author: 'Oscar Wilde', title: 'A Picture of Dorian Gray'},
    {id: 5, author: 'George Orwell', title: '1984'},
    {id: 6, author: 'Jane Austen', title: 'Pride and Prejudice'},
    {id: 7, author: 'Marcus Aurelius', title: 'Meditations'},
    {id: 8, author: 'Fyodor Dostoevsky', title: 'The Brothers Karamazov'},
    {id: 9, author: 'Lev Tolstoy', title: 'Anna Karenina'},
    {id: 10, author: 'Fyodor Dostoevsky', title: 'Crime and Punishment'},
  ]

  function getBooksFilter(inputValue) {
    const lowerCasedInputValue = inputValue.toLowerCase()

    return function booksFilter(book) {
      return (
        !inputValue ||
        book.title.toLowerCase().includes(lowerCasedInputValue) ||
        book.author.toLowerCase().includes(lowerCasedInputValue)
      )
    }
  }

  const items = writable(books);
  
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
    onInputValueChange({inputValue}) {
      items.set(books.filter(getBooksFilter(inputValue)))
    },
    items,
    itemToString(item) {
      return item ? item.title : ''
    },
  })
</script>

<div>
  <div class="container">
    <label class="label" {...getLabelProps()}>Choose your favorite book:</label>
   
    <div class="search-box">
      <input
        placeholder="Best book ever"
        class="input"
        {...getInputProps()}
      />
      <button
        aria-label="toggle menu"
        class="button"
        type="button"
        {...getToggleButtonProps()}
      >
      {#if isOpen}
        &#8593
      {:else}
        &#8595
      {/if}
      </button>
    </div>
  </div>
  <ul
    style:--status={!(isOpen && $items.length) ? 'hidden' : "visible"}
    class="list"
    {...getMenuProps()}
  >
    {#if isOpen}
      {#each $items as item (thing.id)}
          <li
          class={cx(
            highlightedIndex === index && 'bg-blue-300',
            selectedItem === item && 'font-bold',
            'py-2 px-3 shadow-sm flex flex-col',
          )}
          {...getItemProps({item, index})}
        >
          <span>{item.title}</span>

          <span class="text-sm text-gray-700">{item.author}</span>
        </li>
      {/each}
    {/if}
  </ul>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    gap: .25rem;
    width: 18rem;
  }

  .label {
    width: fit-content;
  }

  .search-box {
    background: white;
    display: flex;
    filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06));
    gap: .125rem;
  }

    .input {
      padding: .375rem;
      width: 100%;
    }

    .button {
      padding: 0 .5rem;
    }

  .list {
    background: white;
    margin: .25rem 0 0;
    max-height: 20rem;
    overflow: scroll;
    padding: 0;
    position: absolute;
    visibility: var(--status, 'hidden');
    width: 18rem;
  }
</style>