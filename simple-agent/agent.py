import argparse
import ast
import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from openai import OpenAI


DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.5")

SYSTEM_PROMPT = """
You are a concise, practical assistant. Use tools when they can improve
accuracy. When a tool result is used, explain the result in plain language.
""".strip()


TOOLS = [
    {
        "type": "function",
        "name": "get_current_time",
        "description": "Get the current date and time for an IANA timezone.",
        "parameters": {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": "IANA timezone name, for example UTC, Asia/Tokyo, or America/New_York.",
                }
            },
            "required": ["timezone"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "calculate",
        "description": "Safely evaluate a simple arithmetic expression.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Arithmetic using numbers, parentheses, and +, -, *, /, //, %, or **.",
                }
            },
            "required": ["expression"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


class ToolError(Exception):
    pass


def get_current_time(timezone: str) -> dict[str, str]:
    try:
        tz = ZoneInfo(timezone)
    except ZoneInfoNotFoundError as exc:
        raise ToolError(f"Unknown timezone: {timezone}") from exc

    now = datetime.now(tz)
    return {
        "timezone": timezone,
        "iso": now.isoformat(timespec="seconds"),
        "readable": now.strftime("%A, %B %d, %Y at %I:%M:%S %p %Z"),
    }


def calculate(expression: str) -> dict[str, float | int]:
    node = ast.parse(expression, mode="eval")
    result = _eval_math_node(node.body)
    return {"result": result}


def _eval_math_node(node: ast.AST) -> float | int:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value

    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        value = _eval_math_node(node.operand)
        return value if isinstance(node.op, ast.UAdd) else -value

    if isinstance(node, ast.BinOp):
        left = _eval_math_node(node.left)
        right = _eval_math_node(node.right)

        match node.op:
            case ast.Add():
                return left + right
            case ast.Sub():
                return left - right
            case ast.Mult():
                return left * right
            case ast.Div():
                return left / right
            case ast.FloorDiv():
                return left // right
            case ast.Mod():
                return left % right
            case ast.Pow():
                return left**right

    raise ToolError("Only simple arithmetic expressions are supported.")


def run_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        if name == "get_current_time":
            return {"ok": True, "data": get_current_time(arguments["timezone"])}
        if name == "calculate":
            return {"ok": True, "data": calculate(arguments["expression"])}
        raise ToolError(f"Unknown tool: {name}")
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def field(item: Any, name: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


@dataclass
class AgentResult:
    text: str
    response_id: str


class SimpleAgent:
    def __init__(self, model: str = DEFAULT_MODEL) -> None:
        self.client = OpenAI()
        self.model = model

    def ask(self, prompt: str, previous_response_id: str | None = None) -> AgentResult:
        response = self.client.responses.create(
            model=self.model,
            instructions=SYSTEM_PROMPT,
            input=prompt,
            tools=TOOLS,
            previous_response_id=previous_response_id,
        )

        for _ in range(5):
            tool_calls = [
                item
                for item in field(response, "output", [])
                if field(item, "type") == "function_call"
            ]
            if not tool_calls:
                return AgentResult(text=response.output_text, response_id=response.id)

            tool_outputs = []
            for call in tool_calls:
                name = field(call, "name")
                raw_arguments = field(call, "arguments", "{}")
                arguments = json.loads(raw_arguments)
                output = run_tool(name, arguments)

                tool_outputs.append(
                    {
                        "type": "function_call_output",
                        "call_id": field(call, "call_id"),
                        "output": json.dumps(output),
                    }
                )

            response = self.client.responses.create(
                model=self.model,
                instructions=SYSTEM_PROMPT,
                input=tool_outputs,
                tools=TOOLS,
                previous_response_id=response.id,
            )

        raise RuntimeError("Agent stopped after too many tool-calling rounds.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Simple OpenAI SDK agent")
    parser.add_argument("prompt", nargs="*", help="Prompt to send to the agent")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="OpenAI model to use")
    args = parser.parse_args()

    agent = SimpleAgent(model=args.model)

    if args.prompt:
        result = agent.ask(" ".join(args.prompt))
        print(result.text)
        return

    print("Simple OpenAI agent. Press Ctrl+C or Ctrl+D to exit.")
    previous_response_id = None
    while True:
        try:
            prompt = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not prompt:
            continue

        result = agent.ask(prompt, previous_response_id=previous_response_id)
        previous_response_id = result.response_id
        print(f"\nAgent: {result.text}")


if __name__ == "__main__":
    main()
