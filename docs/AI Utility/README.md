# Assertion Generator

Feed it a sample API response, get back ready-to-paste test assertions
(REST Assured or Postman) covering status code, headers, JSON schema,
and field-level validations — written straight to a `.txt` file.

Available in both Node.js (`assertion_generator.js`) and Python
(`assertion_generator.py`) — same behavior, same flags.

## Setup (Node.js)

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
```

## Setup (Python)

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

```bash
# REST Assured, from a file -- writes example_response_restassured_assertions.txt
node assertion_generator.js --input example_response.json --format rest-assured

# Postman, with expected status
node assertion_generator.js --input example_response.json --format postman --status 201

# Pipe a response straight from curl
curl -s https://api.example.com/v1/accounts/10432 | \
    node assertion_generator.js --stdin --format rest-assured

# Pick your own output file name
node assertion_generator.js --input example_response.json -o AccountAssertions.txt

# See the exact prompt without spending an API call
node assertion_generator.js --input example_response.json --dry-run
```

(The Python version takes identical flags — swap `node assertion_generator.js`
for `python assertion_generator.py`.)

## Flags

| Flag | Description |
|---|---|
| `--input / -i` | Path to JSON file with the sample response |
| `--stdin` | Read the sample response from stdin instead |
| `--format / -f` | `rest-assured` (default) or `postman` |
| `--status / -s` | Expected HTTP status code (default: 200) |
| `--output / -o` | Output file name (default: auto-named from the input file, e.g. `<input>_restassured_assertions.txt`) |
| `--model` | Override the model (default: `claude-sonnet-5`) |
| `--dry-run` | Print the prompt without calling the API |

Output is always written to a text file — nothing prints to the terminal
except a confirmation of where the file went.

## Notes

- Enum-like fields where only one value is observed get a `// TODO` comment
  in the output flagging that the full set of valid values should be
  confirmed rather than assumed.
- Nested objects and arrays are handled recursively — field checks are
  generated for every level of the sample.
