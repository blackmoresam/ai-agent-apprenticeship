import type OpenAI from "openai";

const primaryIntents = ["duplicate_payment", "general_billing", "other", "unknown"] as const;

export type Classification = {
  primaryIntent: (typeof primaryIntents)[number];
  multipleIntents: boolean;
};

export type ReviewDecision = {
  requiresHumanReview: boolean;
  reviewReason: "none" | "insufficient_information" | "multiple_intents" | "unsupported_intent";
};

function isClassification(value: unknown): value is Classification {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const result = value as Record<string, unknown>;
  return (
    Object.keys(result).length === 2 &&
    primaryIntents.some((intent) => intent === result.primaryIntent) &&
    typeof result.multipleIntents === "boolean"
  );
}

export function deriveReviewDecision(classification: Classification): ReviewDecision {
  if (classification.multipleIntents) {
    return { requiresHumanReview: true, reviewReason: "multiple_intents" };
  }

  if (classification.primaryIntent === "duplicate_payment") {
    return { requiresHumanReview: false, reviewReason: "none" };
  }

  if (classification.primaryIntent === "other") {
    return { requiresHumanReview: true, reviewReason: "unsupported_intent" };
  }

  return { requiresHumanReview: true, reviewReason: "insufficient_information" };
}

export async function classifyMessage(client: OpenAI, message: string) {
  const response = await client.responses.create({
    model: "gpt-5-mini",
    instructions: `Classify the customer's message.
- duplicate_payment: the customer explicitly says they were charged more than once.
- general_billing: a billing concern without enough detail to identify a duplicate payment.
- other: a clear nonbilling concern.
- unknown: the message does not provide enough information to identify a billing or nonbilling concern; a generic request for money back alone is unknown.
Set multipleIntents to true when the customer makes two or more distinct requests, such as disputing a charge and cancelling a contract.`,
    input: message,
    text: {
      format: {
        type: "json_schema",
        name: "customer_intent_classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            primaryIntent: { type: "string", enum: [...primaryIntents] },
            multipleIntents: { type: "boolean" },
          },
          required: ["primaryIntent", "multipleIntents"],
          additionalProperties: false,
        },
      },
    },
  });

  if (!response.output_text) {
    throw new Error("The model did not return a classification.");
  }

  const parsed: unknown = JSON.parse(response.output_text);
  if (!isClassification(parsed)) {
    throw new Error("The model returned an invalid classification.");
  }

  return { classification: parsed, usage: response.usage };
}
