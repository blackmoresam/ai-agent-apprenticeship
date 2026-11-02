import OpenAI from "openai";
import { classifyMessage, deriveReviewDecision } from "./intent-classification.ts";

const client = new OpenAI();
const message = "I want to cancel my contract and get my money back because you have charged me twice.";

const { classification } = await classifyMessage(client, message);
const reviewDecision = deriveReviewDecision(classification);

console.log("Classification:", classification);
console.log("Review decision:", reviewDecision);
