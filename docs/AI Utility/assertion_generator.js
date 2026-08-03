#!/usr/bin/env node
/**
 * assertion_generator.js
 *
 * Feed it a sample API response (JSON) and it calls Claude to generate
 * ready-to-paste test assertions -- REST Assured (Java) or Postman (JS/Chai) --
 * covering status code, headers, JSON schema, and field-level validations.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node assertion_generator.js --input response.json --format rest-assured
 *   node assertion_generator.js --input response.json --format postman --status 201
 *   cat response.json | node assertion_generator.js --stdin --format rest-assured
 *   node assertion_generator.js --input response.json --format rest-assured --dry-run
 *
 * Output is always written to a .txt file (auto-named from the input file,
 * or --output if you want to pick the name yourself) -- nothing is required
 * beyond the input.
 *
 * Requires:
 *   npm install @anthropic-ai/sdk
 */

const fs = require("fs");

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are a senior QA automation engineer. You generate test \
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
matching that structure.`;

function parseArgs(argv) {
  const args = {
    format: "rest-assured",
    status: 200,
    model: MODEL,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--input":
      case "-i":
        args.input = argv[++i];
        break;
      case "--stdin":
        args.stdin = true;
        break;
      case "--format":
      case "-f":
        args.format = argv[++i];
        break;
      case "--status":
      case "-s":
        args.status = parseInt(argv[++i], 10);
        break;
      case "--output":
      case "-o":
        args.output = argv[++i];
        break;
      case "--model":
        args.model = argv[++i];
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        console.error(`Unknown argument: ${a}`);
        process.exit(1);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Generate REST Assured or Postman assertions from a sample API response.

Usage: node assertion_generator.js [options]

Options:
  -i, --input <file>     Path to a JSON file containing the sample response
      --stdin             Read the sample response from stdin
  -f, --format <fmt>      "rest-assured" (default) or "postman"
  -s, --status <code>     Expected HTTP status code (default: 200)
  -o, --output <file>     Output file name (default: auto-named from input, .txt)
      --model <name>      Model to use (default: ${MODEL})
      --dry-run           Print the prompt without calling the API
  -h, --help              Show this help
`);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function buildUserPrompt(sample, format, status) {
  const parts = [`Sample API response body (JSON):\n\`\`\`json\n${sample}\n\`\`\``];
  parts.push(`\nExpected HTTP status code: ${status}`);
  parts.push(`\nGenerate ${format} assertions per the rules in the system prompt.`);
  return parts.join("\n");
}

function defaultOutputName(inputPath, format) {
  const suffix = format === "postman" ? "postman_assertions" : "restassured_assertions";
  if (!inputPath) return `${suffix}.txt`;
  const base = inputPath.replace(/\.[^/.]+$/, "").replace(/[\\/]/g, "_");
  return `${base}_${suffix}.txt`;
}

async function callClaude(system, user, model) {
  let Anthropic;
  try {
    Anthropic = require("@anthropic-ai/sdk");
  } catch (e) {
    console.error("The '@anthropic-ai/sdk' package isn't installed. Run: npm install @anthropic-ai/sdk");
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Set ANTHROPIC_API_KEY in your environment first.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.input && !args.stdin) {
    console.error("Provide --input <file> or --stdin");
    process.exit(1);
  }

  let raw;
  if (args.stdin) {
    raw = await readStdin();
  } else {
    raw = fs.readFileSync(args.input, "utf8");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`Input isn't valid JSON: ${e.message}`);
    process.exit(1);
  }
  const sample = JSON.stringify(parsed, null, 2);

  const userPrompt = buildUserPrompt(sample, args.format, args.status);

  if (args.dryRun) {
    console.log("--- SYSTEM PROMPT ---");
    console.log(SYSTEM_PROMPT);
    console.log("\n--- USER PROMPT ---");
    console.log(userPrompt);
    return;
  }

  const result = await callClaude(SYSTEM_PROMPT, userPrompt, args.model);

  const outputPath = args.output || defaultOutputName(args.input, args.format);
  fs.writeFileSync(outputPath, result);
  console.log(`Assertions written to ${outputPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
