
'use server';

/**
 * @fileOverview This file defines the generateProductionPlan flow, which automatically generates an initial production plan
 * based on demand, stock levels, machine capacity, and historical downtime.
 *
 * @exports generateProductionPlan - An async function that triggers the production plan generation flow.
 * @exports GenerateProductionPlanInput - The input type for the generateProductionPlan function.
 * @exports GenerateProductionPlanOutput - The output type for the generateProductionPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the production plan generation.
const GenerateProductionPlanInputSchema = z.object({
  demandData: z.string().describe('Demand data in JSON format.'),
  stockLevels: z.string().describe('Stock levels in JSON format.'),
  machineCapacity: z.string().describe('Machine capacity data in JSON format.'),
  historicalDowntime: z.string().describe('Historical downtime data in JSON format.'),
  scrapData: z.string().describe('Historical scrap data in JSON format.'),
  calendarEvents: z.string().describe('Calendar events like holidays or maintenance in JSON format.'),
  runParams: z.string().describe('Run parameters for the planning algorithm in JSON format.'),
});
export type GenerateProductionPlanInput = z.infer<typeof GenerateProductionPlanInputSchema>;

// Output schema for the production plan.
const GenerateProductionPlanOutputSchema = z.object({
  plan: z.string().describe('Generated production plan in JSON format.'),
});
export type GenerateProductionPlanOutput = z.infer<typeof GenerateProductionPlanOutputSchema>;

// Wrapper function to trigger the production plan flow.
export async function generateProductionPlan(input: GenerateProductionPlanInput): Promise<GenerateProductionPlanOutput> {
  return generateProductionPlanFlow(input);
}

// Define the prompt for generating the production plan.
const productionPlanPrompt = ai.definePrompt({
  name: 'productionPlanPrompt',
  input: {schema: GenerateProductionPlanInputSchema},
  output: {schema: GenerateProductionPlanOutputSchema},
  prompt: `You are an AI production planner. Generate an optimized production plan based on the following information. Account for historical scrap rates when calculating required production quantities and calendar events for machine availability.

Demand Data: {{{demandData}}}
Stock Levels: {{{stockLevels}}}
Machine Capacity: {{{machineCapacity}}}
Historical Downtime: {{{historicalDowntime}}}
Historical Scrap Data: {{{scrapData}}}
Calendar Events: {{{calendarEvents}}}
Run Parameters: {{{runParams}}}

Return the plan in JSON format.
`,
});

// Define the Genkit flow for generating the production plan.
const generateProductionPlanFlow = ai.defineFlow(
  {
    name: 'generateProductionPlanFlow',
    inputSchema: GenerateProductionPlanInputSchema,
    outputSchema: GenerateProductionPlanOutputSchema,
  },
  async input => {
    const {output} = await productionPlanPrompt(input);
    return output!;
  }
);
