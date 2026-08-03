#!/usr/bin/env python3
"""
assertion_generator.py

Feed it a sample API response (JSON) and it calls Claude to generate
ready-to-paste test assertions -- REST Assured (Java) or Postman (JS/Chai) --
covering status code, headers, JSON schema, and field-level validations.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python assertion_generator.py --input response.json --format rest-assured
    python assertion_generator.py --input response.json --format postman --status 201
    cat response.json | python assertion_generator.py --format rest-assured --stdin
    python assertion_generator.py --input response.json --format rest-assured --dry-run

Requires:
    pip install anthropic
"""

import argparse
import json
import os
import sys

MODEL = "claude-sonnet-5"

SYSTEM_PROMPT = """You are a senior QA automation engineer. You generate test \
assertions from a sample API response. Output ONLY code -- no prose, no \
explanations, no markdown code fences. Just the raw code block content, \
ready to paste into a test file.

Rules for what to cover, in this order:
1. HTTP status code assertion.
2. Content-Type header assertion (if inferable).
3. A JSON schema validation covering the full shape of the response \
(required fields, types, nullability where a field looks optional).
4. Field-level value assertions for every field in the sample response: \
type checks, not-null checks where the field is present, format checks for \
obviously-typed fields (emails, ISO dates, UUIDs, URLs), and range/pattern \
checks where a value's shape implies a constraint (e.g. an "id" > 0, a \
"status" restricted to an enum-like set of strings if only one value is seen \
-- note it as a TODO comment for the engineer to confirm the full enum).
5. If the response is a JSON array, assert on collection size/non-emptiness \
and apply field-level checks to each element (e.g. via hasItem / everyItem \
in REST Assured, or a .forEach loop in Postman).

Formatting per target:
- rest-assured: valid Java, using io.restassured.RestAssured given().when().then() \
chaining, org.hamcrest.Matchers (equalTo, notNullValue, matchesPattern, \
greaterThan, hasSize, everyItem, etc.), and JSON schema validation via \
matchesJsonSchemaInClasspath or an inline schema string if no separate file \
is implied. Wrap in a single @Test-annotated method with a descriptive name.
- postman: valid JavaScript for the Postman "Tests" tab, using pm.test(...) \
blocks, pm.response.to.have.status(...), pm.expect(...), and \
pm.response.to.have.jsonSchema(...) with an inline schema object. Group \
related checks into separate pm.test blocks (status, schema, field values).

Never invent fields that aren't in the sample. Never omit a field that is in \
the sample. If the response has nested objects, generate nested assertions \
matching that structure."""


def build_user_prompt(sample: str, fmt: str, status: int) -> str:
    parts = [f"Sample API response body (JSON):\n```json\n{sample}\n```"]
    parts.append(f"\nExpected HTTP status code: {status}")
    parts.append(f"\nGenerate {fmt} assertions per the rules in the system prompt.")
    return "\n".join(parts)


def default_output_name(input_path: str | None, fmt: str) -> str:
    suffix = "postman_assertions" if fmt == "postman" else "restassured_assertions"
    if not input_path:
        return f"{suffix}.txt"
    base = os.path.splitext(os.path.basename(input_path))[0]
    return f"{base}_{suffix}.txt"


def call_claude(system: str, user: str, model: str) -> str:
    try:
        import anthropic
    except ImportError:
        print(
            "The 'anthropic' package isn't installed. Run: pip install anthropic",
            file=sys.stderr,
        )
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Set ANTHROPIC_API_KEY in your environment first.", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=4000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(block.text for block in response.content if block.type == "text")


def main():
    parser = argparse.ArgumentParser(
        description="Generate REST Assured or Postman assertions from a sample API response."
    )
    parser.add_argument("--input", "-i", help="Path to a JSON file containing the sample response")
    parser.add_argument("--stdin", action="store_true", help="Read the sample response from stdin")
    parser.add_argument(
        "--format", "-f", choices=["rest-assured", "postman"], default="rest-assured",
        help="Output assertion style (default: rest-assured)",
    )
    parser.add_argument("--status", "-s", type=int, default=200, help="Expected HTTP status code (default: 200)")
    parser.add_argument("--output", "-o", help="Output file name (default: auto-named from input, .txt)")
    parser.add_argument("--model", default=MODEL, help=f"Model to use (default: {MODEL})")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print the prompt that would be sent, without calling the API",
    )
    args = parser.parse_args()

    if args.stdin:
        raw = sys.stdin.read()
    elif args.input:
        with open(args.input, "r") as f:
            raw = f.read()
    else:
        parser.error("Provide --input <file> or --stdin")

    try:
        parsed = json.loads(raw)
        sample = json.dumps(parsed, indent=2)
    except json.JSONDecodeError as e:
        print(f"Input isn't valid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    user_prompt = build_user_prompt(sample, args.format, args.status)

    if args.dry_run:
        print("--- SYSTEM PROMPT ---")
        print(SYSTEM_PROMPT)
        print("\n--- USER PROMPT ---")
        print(user_prompt)
        return

    result = call_claude(SYSTEM_PROMPT, user_prompt, args.model)

    output_path = args.output or default_output_name(args.input, args.format)
    with open(output_path, "w") as f:
        f.write(result)
    print(f"Assertions written to {output_path}")


if __name__ == "__main__":
    main()
