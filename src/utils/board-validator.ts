import { Board, Tile, TileState } from "./game";
import { words as dictionary } from "../constants/words";

enum WordDirection {
  LeftToRight,
  TopToBottom,
}

type WordFromTile = {
  word: string;
  row: number;
  col: number;
  direction: WordDirection;
};

// Check if all words on the board are connected like a crossword.
// Algorithm is roughly:
//  - treat tiles as 2D array
//  - count all letters used <- total
//  - scan until we find a single tile
//  - recursively DFS tile with its neighbors
//  - keep track of all nodes we've seen via WeakMap
//  - when DFS completes, compare total with WeakMap.size()
//  - equal means valid, otherwise invalid
export function validateWordIsland(board: Board) {
  const tiles = board.tiles;
  const maxRow = tiles.length;
  const maxCol = tiles[0].length;
  const total = countFilledTiles(tiles);

  // Track all visited tiles to avoid infinite loops.
  const visitedTiles = new Set<Tile>();

  // Find any tile to start.
  const startingTile = findAnyTile(tiles);

  // If there were no tiles to be found, we can just exit.
  if (!startingTile) {
    return false;
  }

  function markTilesDFS(tile: Tile | null): void {
    // Ignore tiles that do not exist.
    if (!tile) return;

    // Ignore visited tiles.
    if (visitedTiles.has(tile)) return;

    visitedTiles.add(tile);
    const { row, col } = tile;

    if (row > 0) {
      const tile = tiles[row - 1][col];
      if (tile.letter !== null && !visitedTiles.has(tile)) {
        markTilesDFS(tile);
      }
    }

    if (col > 0) {
      const tile = tiles[row][col - 1];
      if (tile.letter !== null && !visitedTiles.has(tile)) {
        markTilesDFS(tile);
      }
    }

    if (row < maxRow - 1) {
      const tile = tiles[row + 1][col];
      if (tile.letter !== null && !visitedTiles.has(tile)) {
        markTilesDFS(tile);
      }
    }

    if (col < maxCol - 1) {
      const tile = tiles[row][col + 1];
      if (tile.letter !== null && !visitedTiles.has(tile)) {
        markTilesDFS(tile);
      }
    }
  }

  markTilesDFS(startingTile);

  return visitedTiles.size === total;
}

function findAnyTile(tiles: Tile[][]) {
  for (const row of tiles) {
    for (const tile of row) {
      if (tile.letter !== null) {
        return tile;
      }
    }
  }

  return null;
}

export function validateBoard(board: Board): [Board, boolean] {
  const tiles = board.tiles;
  const gridBounds = tiles.length;

  // Get all words going left to right.
  const leftToRight = getWordsFromTilesLTR(tiles);

  // Get all words going top to bottom.
  const topToBottom = getWordsFromTilesTTB(tiles);

  // Collect all the words together.
  const foundWords = leftToRight.concat(topToBottom);

  // Validate entire board (easier this way).
  let allWordsAreValid = foundWords.every(({ word }) => dictionary.has(word));

  // Initialize all tiles to be invalid.
  const validatedBoard = {
    cursor: board.cursor,
    tiles: tiles.map((row) =>
      row.map((tile) =>
        tile.letter
          ? { ...tile, state: TileState.INVALID }
          : { ...tile, state: TileState.IDLE },
      ),
    ),
  };

  // Validate the found words tiles.
  const validFoundWords = foundWords.filter(({ word }) => dictionary.has(word));
  for (const word of validFoundWords) {
    const length = word.word.length;
    const direction = word.direction;

    switch (direction) {
      case WordDirection.LeftToRight:
        for (let c = 0; c < length; c++) {
          const tile = validatedBoard.tiles[word.row][word.col + c];
          tile.state = TileState.VALID;
        }
        break;
      case WordDirection.TopToBottom:
        for (let r = 0; r < length; r++) {
          if (word.row + r > gridBounds - 1) continue;
          const tile = validatedBoard.tiles[word.row + r][word.col];
          tile.state = TileState.VALID;
        }
        break;
    }
  }

  // Mark any mixed tiles (partially correct).
  // It's easier to do this after we mark the correct tiles.
  const invalidFoundWords = foundWords.filter(({ word }) => !dictionary.has(word));
  for (const word of invalidFoundWords) {
    const length = word.word.length;
    const direction = word.direction;

    switch (direction) {
      case WordDirection.LeftToRight:
        for (let c = 0; c < length; c++) {
          const tile = validatedBoard.tiles[word.row][word.col + c];
          tile.state = tile.state === TileState.VALID ? TileState.INVALID : tile.state;
        }
        break;
      case WordDirection.TopToBottom:
        for (let r = 0; r < length; r++) {
          if (word.row + r > gridBounds - 1) continue;
          const tile = validatedBoard.tiles[word.row + r][word.col];
          tile.state = tile.state === TileState.VALID ? TileState.INVALID : tile.state;
        }
        break;
    }
  }

  return [validatedBoard, allWordsAreValid];
}

function getWordsFromTilesLTR(tiles: Tile[][]): WordFromTile[] {
  return tiles
    .map((row): WordFromTile[] => {
      const words: WordFromTile[] = [];
      let current: WordFromTile | null = null;

      for (const tile of row) {
        const char = tile.letter?.letter;

        // Initialize.
        if (!current && char) {
          current = {
            word: char,
            row: tile.row,
            col: tile.col,
            direction: WordDirection.LeftToRight,
          };
          continue;
        }

        // Append the new character.
        if (current && char) {
          current.word += char;
          continue;
        }

        // Complete the word.
        if (current && !char) {
          words.push(current);
          current = null;
          continue;
        }
      }

      // Flush the `current`
      if (current) {
        words.push(current);
      }

      return words;
    })
    .flat()
    .filter((word) => word.word.length > 1)
    .map((word) => ({
      ...word,
      word: word.word.toLowerCase(),
    }));
}

function getWordsFromTilesTTB(tiles: Tile[][]): WordFromTile[] {
  const words: WordFromTile[] = [];

  for (let c = 0; c < tiles[0].length; c++) {
    let current: WordFromTile | null = null;

    for (let r = 0; r < tiles.length; r++) {
      const tile = tiles[r][c];
      const char = tile.letter?.letter;

      // Initialize.
      if (!current && char) {
        current = {
          word: char,
          row: tile.row,
          col: tile.col,
          direction: WordDirection.TopToBottom,
        };
        continue;
      }

      // Append the new character.
      if (current && char) {
        current.word += char;
        continue;
      }

      // Complete the word.
      if (current && !char) {
        words.push(current);
        current = null;
        continue;
      }
    }

    // Flush the `current`
    if (current) {
      words.push(current);
    }
  }

  return words
    .flat()
    .filter((word) => word.word.length > 1)
    .map((word) => ({
      ...word,
      word: word.word.toLowerCase(),
    }));
}

export function countLettersOnBoard(board: Board): number {
  return countFilledTiles(board.tiles);
}

export function countValidLettersOnBoard(board: Board): number {
  return countValidTiles(board.tiles);
}

function countFilledTiles(tiles: Tile[][]) {
  return new Set(
    tiles
      .map((row) => row.map((tile) => tile.letter))
      .flat()
      .filter((letter) => letter !== null),
  ).size;
}

function countValidTiles(tiles: Tile[][]) {
  return new Set(
    tiles
      .map((row) =>
        row
          .filter((tile) => tile.state === TileState.VALID || tile.state === TileState.MIXED)
          .map((letter) => letter.id),
      )
      .flat(),
  ).size;
}
