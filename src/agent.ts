import OpenAI from "openai";

const authenticatedSession = { customerId: "CUST-001" } as const;

function getCustomerAccount() {
  return {
    customerId: authenticatedSession.customerId,
    monthlyPlanGbp: 15,
    accountStatus: "active",
  };
}

const responseInstructions = `For account questions, request getCustomerAccount before answering.
Use only facts established by its result in customer-facing replies. This experiment can only read the authenticated customer's account summary: customer ID, monthly plan, and account status.
Do not offer or claim to view invoices, change plans, issue refunds, update payment methods, verify identity, or take any other action.
Do not invent account details or promise future actions. Keep the reply natural, concise, and helpful.`;

const client = new OpenAI();

const firstResponse = await client.responses.create({
  model: "gpt-5-mini",
  instructions: responseInstructions,
  input: "Can you check my account?",
  tools: [
    {
      type: "function",
      name: "getCustomerAccount",
      description: "Read the authenticated customer's synthetic account summary.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  ],
  parallel_tool_calls: false,
}).catch((error: unknown) => {
  throw new Error(`Initial OpenAI API request failed: ${error instanceof Error ? error.message : "unknown error"}`);
});

const toolCalls = firstResponse.output.filter((item) => item.type === "function_call");
if (toolCalls.length !== 1) {
  throw new Error(`Expected one tool call; received ${toolCalls.length}.`);
}

const toolCall = toolCalls[0];
if (toolCall.name !== "getCustomerAccount") {
  throw new Error(`Unexpected tool name: ${toolCall.name}`);
}

let argumentsValue: unknown;
try {
  argumentsValue = JSON.parse(toolCall.arguments);
} catch {
  throw new Error("Malformed tool arguments: expected an empty JSON object.");
}
if (
  typeof argumentsValue !== "object" ||
  argumentsValue === null ||
  Array.isArray(argumentsValue) ||
  Object.keys(argumentsValue).length !== 0
) {
  throw new Error("Malformed tool arguments: expected an empty JSON object.");
}

console.log("Requested tool:", toolCall.name);
console.log("Arguments:", argumentsValue);
const account = getCustomerAccount();
console.log("Tool result:", account);

const finalResponse = await client.responses.create({
  model: "gpt-5-mini",
  instructions: responseInstructions,
  previous_response_id: firstResponse.id,
  input: [
    {
      type: "function_call_output",
      call_id: toolCall.call_id,
      output: JSON.stringify(account),
    },
  ],
  tool_choice: "none",
}).catch((error: unknown) => {
  throw new Error(`Final OpenAI API request failed: ${error instanceof Error ? error.message : "unknown error"}`);
});

if (!finalResponse.output_text) {
  throw new Error("The model did not return a final response.");
}
console.log("Final response:", finalResponse.output_text);
