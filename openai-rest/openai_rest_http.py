import http.client
import json
import os
import sys


API_HOST = "api.openai.com"
API_PATH = "/v1/responses"


def extract_text(response_body):
    parts = []
    for item in response_body.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                parts.append(content.get("text", ""))
    return "\n".join(parts)


def main():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Set OPENAI_API_KEY before running this script.", file=sys.stderr)
        sys.exit(1)

    prompt = " ".join(sys.argv[1:]) or "Write a one-sentence haiku about direct REST APIs."
    payload = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        "input": prompt,
    }

    conn = http.client.HTTPSConnection(API_HOST, timeout=60)
    try:
        conn.request(
            "POST",
            API_PATH,
            body=json.dumps(payload),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        response = conn.getresponse()
        raw_body = response.read().decode("utf-8")
    finally:
        conn.close()

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        print(raw_body)
        sys.exit(1)

    if response.status >= 400:
        print(json.dumps(body, indent=2), file=sys.stderr)
        sys.exit(1)

    print(extract_text(body) or json.dumps(body, indent=2))


if __name__ == "__main__":
    main()
