/** Split books into shelf rows (max books per row). */
export function chunkBooksForShelves<T>(books: T[], perShelf = 5): T[][] {
  if (books.length === 0) return [];

  const chunks: T[][] = [];
  for (let i = 0; i < books.length; i += perShelf) {
    chunks.push(books.slice(i, i + perShelf));
  }
  return chunks;
}
