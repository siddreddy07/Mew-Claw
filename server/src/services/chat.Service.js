import { orchestrator } from '../ai/orchestrator/orchestrator.js';
import { presentor } from '../ai/presentor/presentor.js';
import { tools } from '../tools/index.js';

export async function processQuery(userQuery) {
  try {
    const plan = await orchestrator(userQuery);

    console.log('Orchestrator plan:', plan);

    if (plan.toolName === 'general') {
      return { answer: plan.answer, toolName: 'general' };
    }

    const tool = tools[plan.toolName];
    const validatedParams = tool.schema.parse(plan.parameters);
    const result = await tool.execute(validatedParams);

    const { answer } = await presentor(userQuery, plan.toolName, result);

    console.log('Presentor answer:', answer);

    const needsApproval = result?.status === 'pending';

    return { answer, result, toolName: plan.toolName, needsApproval };
  } catch (error) {
    console.error('processQuery error:', error.message);
    throw error;
  }
}

