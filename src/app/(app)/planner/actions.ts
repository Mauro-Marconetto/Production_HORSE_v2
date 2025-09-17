"use server";

import { generateProductionPlan, GenerateProductionPlanInput } from "@/ai/flows/generate-production-plan";
import { refineProductionPlan } from "@/ai/flows/refine-production-plan";
import { planAssignments } from "@/lib/data";

export async function runGeneratePlan(params: any) {
  console.log("Generating plan with params:", params);
  
  // This is a mock implementation.
  // In a real scenario, you would format the input correctly
  // for the generateProductionPlan Genkit flow.
  const mockInput: GenerateProductionPlanInput = {
    demandData: JSON.stringify({}),
    stockLevels: JSON.stringify({}),
    machineCapacity: JSON.stringify({}),
    historicalDowntime: JSON.stringify({}),
    runParams: JSON.stringify(params),
  };

  try {
    // const result = await generateProductionPlan(mockInput);
    // const plan = JSON.parse(result.plan);
    // return plan;

    // Returning mock data for now
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate some changes based on params
    const newAssignments = planAssignments.map(a => ({
        ...a,
        horas: a.horas * (params.oee / 0.8),
        prodUnidades: Math.round(a.prodUnidades * (params.oee / 0.8)),
    }));
    
    return { success: true, plan: newAssignments };

  } catch (error) {
    console.error("Error generating production plan:", error);
    return { success: false, error: "Failed to generate plan." };
  }
}
