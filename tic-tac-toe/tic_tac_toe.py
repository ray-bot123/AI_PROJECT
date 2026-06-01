"""Terminal tic-tac-toe game."""

from __future__ import annotations

import random


WINNING_LINES = (
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),
    (0, 4, 8),
    (2, 4, 6),
)


def draw_board(board: list[str]) -> None:
    """Print the current board."""
    print()
    for row in range(0, 9, 3):
        print(f" {board[row]} | {board[row + 1]} | {board[row + 2]} ")
        if row < 6:
            print("---+---+---")
    print()


def winner(board: list[str]) -> str | None:
    """Return the winning player marker, or None if nobody has won."""
    for a, b, c in WINNING_LINES:
        if board[a] == board[b] == board[c] and board[a] in {"X", "O"}:
            return board[a]
    return None


def is_draw(board: list[str]) -> bool:
    """Return True when every space is filled and there is no winner."""
    return winner(board) is None and all(space in {"X", "O"} for space in board)


def available_moves(board: list[str]) -> list[int]:
    """Return board indexes that are still open."""
    return [index for index, space in enumerate(board) if space not in {"X", "O"}]


def choose_mode() -> str:
    """Ask whether to play against another person or the computer."""
    while True:
        mode = input("Choose mode: 1 = two players, 2 = vs computer: ").strip()
        if mode in {"1", "2"}:
            return mode
        print("Please enter 1 or 2.")


def get_human_move(board: list[str], player: str) -> int:
    """Ask the current player for a valid move."""
    while True:
        move = input(f"Player {player}, choose a square (1-9): ").strip()
        if not move.isdigit():
            print("Please enter a number from 1 to 9.")
            continue

        index = int(move) - 1
        if index not in range(9):
            print("Please enter a number from 1 to 9.")
        elif board[index] in {"X", "O"}:
            print("That square is already taken.")
        else:
            return index


def find_winning_move(board: list[str], player: str) -> int | None:
    """Return a move that lets player win immediately, if one exists."""
    for move in available_moves(board):
        trial_board = board.copy()
        trial_board[move] = player
        if winner(trial_board) == player:
            return move
    return None


def get_computer_move(board: list[str]) -> int:
    """Choose a simple but decent computer move."""
    winning_move = find_winning_move(board, "O")
    if winning_move is not None:
        return winning_move

    blocking_move = find_winning_move(board, "X")
    if blocking_move is not None:
        return blocking_move

    for preferred_move in (4, 0, 2, 6, 8):
        if preferred_move in available_moves(board):
            return preferred_move

    return random.choice(available_moves(board))


def play_game() -> None:
    """Run one game."""
    board = [str(number) for number in range(1, 10)]
    mode = choose_mode()
    current_player = "X"

    while winner(board) is None and not is_draw(board):
        draw_board(board)

        if mode == "2" and current_player == "O":
            move = get_computer_move(board)
            print(f"Computer chooses square {move + 1}.")
        else:
            move = get_human_move(board, current_player)

        board[move] = current_player
        current_player = "O" if current_player == "X" else "X"

    draw_board(board)
    winning_player = winner(board)
    if winning_player:
        if mode == "2" and winning_player == "O":
            print("Computer wins!")
        else:
            print(f"Player {winning_player} wins!")
    else:
        print("It's a draw!")


def main() -> None:
    print("Tic-Tac-Toe")
    while True:
        play_game()
        again = input("Play again? (y/n): ").strip().lower()
        if again != "y":
            print("Thanks for playing!")
            break


if __name__ == "__main__":
    main()
