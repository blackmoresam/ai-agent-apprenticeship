import OpenAI from "openai";
import { classifyMessage, deriveReviewDecision } from "./intent-classification.ts";
import type { Classification, ReviewDecision } from "./intent-classification.ts";

type EvaluationCase = {
  id: string;
  message: string;
  expected: Classification & ReviewDecision;
};

const cases = [
  {
    id: "01",
    message: "You've charged me twice this month.",
    expected: { primaryIntent: "duplicate_payment", multipleIntents: false, requiresHumanReview: false, reviewReason: "none" },
  },
  {
    id: "02",
    message: "My bill doesn't look right.",
    expected: { primaryIntent: "general_billing", multipleIntents: false, requiresHumanReview: true, reviewReason: "insufficient_information" },
  },
  {
    id: "03",
    message: "My internet connection keeps dropping.",
    expected: { primaryIntent: "other", multipleIntents: false, requiresHumanReview: true, reviewReason: "unsupported_intent" },
  },
  {
    id: "04",
    message: "You've charged me twice and I want to cancel.",
    expected: { primaryIntent: "duplicate_payment", multipleIntents: true, requiresHumanReview: true, reviewReason: "multiple_intents" },
  },
  {
    id: "05",
    message: "I'm furious. I want my money back.",
    expected: { primaryIntent: "unknown", multipleIntents: false, requiresHumanReview: true, reviewReason: "insufficient_information" },
  },
  {
    id: "06",
    message: "I paid £15 for October and another £15 for November. Why have you charged me twice?",
    expected: { primaryIntent: "duplicate_payment", multipleIntents: false, requiresHumanReview: false, reviewReason: "none" },
  },
  {
    id: "07",
    message: "I don't understand the extra £8 on my latest bill.",
    expected: { primaryIntent: "general_billing", multipleIntents: false, requiresHumanReview: true, reviewReason: "insufficient_information" },
  },
  {
    id: "08",
    message: "This is unacceptable. I want compensation.",
    expected: { primaryIntent: "unknown", multipleIntents: false, requiresHumanReview: true, reviewReason: "insufficient_information" },
  },
  {
    id: "09",
    message: "My direct debit amount has changed and I don't know why.",
    expected: { primaryIntent: "general_billing", multipleIntents: false, requiresHumanReview: true, reviewReason: "insufficient_information" },
  },
] as const satisfies readonly EvaluationCase[];

const fields = ["primaryIntent", "multipleIntents", "requiresHumanReview", "reviewReason"] as const;
const client = new OpenAI({ maxRetries: 0 });
let apiCalls = 0;
let passedCases = 0;
let usageReports = 0;
let inputTokens = 0;
let outputTokens = 0;
let totalTokens = 0;

for (const testCase of cases) {
  console.log(`\nCase ${testCase.id}: ${testCase.message}`);
  console.log("Expected:", testCase.expected);
  apiCalls++;

  try {
    const { classification, usage } = await classifyMessage(client, testCase.message);
    const actual = { ...classification, ...deriveReviewDecision(classification) };
    console.log("Actual:", actual);

    const passed = fields.map((field) => {
      const matches = actual[field] === testCase.expected[field];
      console.log(`  ${field}: ${matches ? "PASS" : "FAIL"}`);
      return matches;
    });
    if (passed.every(Boolean)) passedCases++;

    if (usage) {
      usageReports++;
      inputTokens += usage.input_tokens;
      outputTokens += usage.output_tokens;
      totalTokens += usage.total_tokens;
    }
  } catch (error) {
    console.log("Actual: unavailable");
    for (const field of fields) console.log(`  ${field}: FAIL`);
    console.log("Request or validation error:", error instanceof Error ? error.name : "UnknownError");
  }
}

console.log(`\nSummary: ${passedCases}/${cases.length} cases passed`);
console.log(`Total API calls: ${apiCalls}`);
console.log(
  usageReports > 0
    ? `Token usage (${usageReports} responses): input ${inputTokens}, output ${outputTokens}, total ${totalTokens}`
    : "Token usage: unavailable",
);
