# Testing Guidelines

There is no automated test suite yet. For logic changes, add tests under `tests/` using `pytest` when practical.

Good initial targets are:

- `winner(board)`
- `is_draw(board)`
- `available_moves(board)`
- `find_winning_move(board, player)`
- `get_computer_move(board)`

Name test files `test_*.py` and test functions `test_*`. If `pytest` is added, document it in a dependency file and run tests with `python -m pytest`.
