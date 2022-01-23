import React, { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Board, Config, Letter, Tile } from "../utils/game";

type BoardOptions = {
  board: Board;
  setLetterOnBoard: (position: [number, number], letter: Letter | null) => void;
  resetBoard: () => void;
};

export const useBoard = (): BoardOptions => {
  const [board, setBoard] = React.useState(initalizeBoard());

  const setLetterOnBoard = useCallback(
    (position: [number, number], letter: Letter | null) => {
      setBoard((board) => {
        const [row, col] = position;
        const newTiles = board.tiles.slice();

        // Set new tile.
        newTiles[row][col].letter = letter;

        return { tiles: newTiles };
      });
    },
    [],
  );

  const resetBoard = useCallback(() => {
    setBoard((board) => ({
      tiles: board.tiles.map((row) =>
        row.map((tile) => ({ ...tile, letter: null })),
      ),
    }));
  }, []);

  return {
    board,
    setLetterOnBoard,
    resetBoard,
  };
};

function initalizeBoard(): Board {
  const tiles = new Array(Config.TileCount).fill(null).map((_, row) =>
    new Array(Config.TileCount).fill(null).map(
      (_, col) =>
        ({
          id: uuidv4(),
          row,
          col,
          letter: null,
        } as Tile),
    ),
  );

  return { tiles };
}
