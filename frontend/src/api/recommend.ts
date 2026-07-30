// API client for AI plan recommendation.

import { client } from './client';
import type {
  LlmProvider,
  LlmTestResult,
  RecommendInput,
  RecommendResponse,
} from '../types';

export const recommendApi = {
  async generate(input: RecommendInput): Promise<RecommendResponse> {
    const { data } = await client.post<RecommendResponse>('/plans/recommend', input);
    return data;
  },

  async testLlm(provider: LlmProvider, apiKey: string): Promise<LlmTestResult> {
    const { data } = await client.post<{ data: LlmTestResult }>(
      '/plans/recommend/test-llm',
      { provider, api_key: apiKey },
    );
    return data.data;
  },
};
