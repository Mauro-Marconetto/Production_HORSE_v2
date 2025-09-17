// src/ai/flows/refine-production-plan.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for refining a production plan using AI suggestions.
 *
 * It takes in a production plan and organization data, and outputs AI-driven suggestions for alternatives or optimizations.
 *
 * @exports refineProductionPlan - The main function to trigger the production plan refinement flow.
 * @exports RefineProductionPlanInput - The input type for the refineProductionPlan function.
 * @exports RefineProductionPlanOutput - The output type for the refineProductionPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineProductionPlanInputSchema = z.object({
  productionPlan: z.string().describe('The current production plan in a serialized format.'),
  organizationData: z.string().describe('Relevant organizational data like machine capacity, stock levels, etc.'),
});
export type RefineProductionPlanInput = z.infer<typeof RefineProductionPlanInputSchema>;

const RefineProductionPlanOutputSchema = z.object({
  suggestions: z.string().describe('AI-driven suggestions for refining the production plan.'),
});
export type RefineProductionPlanOutput = z.infer<typeof RefineProductionPlanOutputSchema>;

export async function refineProductionPlan(input: RefineProductionPlanInput): Promise<RefineProductionPlanOutput> {
  return refineProductionPlanFlow(input);
}

const refineProductionPlanPrompt = ai.definePrompt({
  name: 'refineProductionPlanPrompt',
  input: {schema: RefineProductionPlanInputSchema},
  output: {schema: RefineProductionPlanOutputSchema},
  prompt: `You are an AI assistant specialized in optimizing production plans for manufacturing.

  Based on the current production plan and the provided organization data, suggest refinements to improve efficiency, reduce costs, or meet demand more effectively.

  Production Plan:
  {{productionPlan}}

  Organization Data:
  {{organizationData}}

  Provide specific, actionable suggestions.
`,
});

const refineProductionPlanFlow = ai.defineFlow(
  {
    name: 'refineProductionPlanFlow',
    inputSchema: RefineProductionPlanInputSchema,
    outputSchema: RefineProductionPlanOutputSchema,
  },
  async input => {
    const {output} = await refineProductionPlanPrompt(input);
    return output!;
  }
);
