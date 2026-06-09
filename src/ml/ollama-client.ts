/**
 * Ollama Client - Local SLM interface for contextual text generation
 * Falls back to Faker when Ollama is unavailable
 */

import { faker } from '@faker-js/faker/locale/vi';

export interface OllamaConfig {
  host: string;
  model: string;
  fallback: 'faker' | 'fail';
  temperature: number;
  concurrency: number;
}

const DEFAULT_CONFIG: OllamaConfig = {
  host: 'http://localhost:11434',
  model: 'llama3.1:8b',
  fallback: 'faker',
  temperature: 0.8,
  concurrency: 3,
};

export class OllamaClient {
  private config: OllamaConfig;
  private isAvailable: boolean | null = null;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) return this.isAvailable;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(this.config.host + '/api/tags', {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      this.isAvailable = response.ok;
    } catch {
      this.isAvailable = false;
      if (this.config.fallback === 'faker') {
        console.warn('\u26A0\uFE0F  Ollama not available \u2014 falling back to Faker for text generation');
      }
    }

    return this.isAvailable;
  }

  async generateSingle(prompt: string): Promise<string> {
    if (!await this.checkAvailability()) {
      return faker.lorem.paragraph(2);
    }

    try {
      const response = await fetch(this.config.host + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          stream: false,
          options: { temperature: this.config.temperature },
        }),
      });

      const data = await response.json() as { response: string };
      return (data.response ?? '').trim();
    } catch {
      return faker.lorem.paragraph(2);
    }
  }

  async generateBatch(
    prompts: string[],
    options?: { concurrency?: number },
  ): Promise<string[]> {
    if (!await this.checkAvailability()) {
      return prompts.map(() => faker.lorem.paragraph(2));
    }

    const concurrency = options?.concurrency ?? this.config.concurrency;
    const results: string[] = [];

    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(prompt => this.generateSingle(prompt)),
      );
      results.push(...batchResults);

      if (prompts.length > 100) {
        process.stdout.write('\r  \uD83D\uDCDD Generating text: ' + Math.min(i + concurrency, prompts.length) + '/' + prompts.length);
      }
    }

    if (prompts.length > 100) console.log();
    return results;
  }

  setAvailable(available: boolean): void {
    this.isAvailable = available;
  }
}
