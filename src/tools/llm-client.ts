/**
 * LLM Client - Anthropic API wrapper for domain detection
 * Used only for one-time schema analysis (small token usage)
 */

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

const DEFAULT_CONFIG: LLMConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 2000,
};

export type BusinessDomain = 'ecommerce' | 'healthcare' | 'logistics' | 'fintech' | 'social' | 'education' | 'hr' | 'saas' | 'restaurant' | 'realestate' | 'generic';
export type MarketRegion = 'vietnam' | 'global' | 'us' | 'eu';

export interface DomainContext {
  domain: BusinessDomain;
  market: MarketRegion;
  language: 'vi' | 'en';
  locale: string;
  tables: Array<{ name: string; purpose: string; hints: string[] }>;
  hints: Record<string, string>;
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async detectDomain(schemaText: string): Promise<DomainContext> {
    // If no API key, fall back to heuristic domain detection
    if (!this.config.apiKey) {
      return heuristicDomainDetection(schemaText);
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          messages: [{
            role: 'user',
            content: buildDomainDetectionPrompt(schemaText),
          }],
        }),
      });

      const data = await response.json() as { content: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text ?? '';
      return parseDomainResponse(text);
    } catch {
      return heuristicDomainDetection(schemaText);
    }
  }
}

function buildDomainDetectionPrompt(schemaText: string): string {
  return 'Analyze this database schema and determine:\n' +
    '1. Business domain (ecommerce, healthcare, logistics, fintech, social, education, hr, saas, restaurant, realestate, generic)\n' +
    '2. Geographic market (vietnam, global, us, eu)\n' +
    '3. For each table: its business purpose in 1 sentence\n' +
    '4. Realistic data generation hints for non-obvious fields\n\n' +
    'Schema:\n' + schemaText + '\n\n' +
    'Output as JSON: { "domain": "...", "market": "...", "language": "...", "locale": "...", "tables": [{ "name": "...", "purpose": "...", "hints": [...] }], "hints": {} }';
}

function parseDomainResponse(text: string): DomainContext {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        domain: parsed.domain ?? 'generic',
        market: parsed.market ?? 'global',
        language: parsed.language ?? 'en',
        locale: parsed.locale ?? 'en-US',
        tables: parsed.tables ?? [],
        hints: parsed.hints ?? {},
      };
    }
  } catch {
    // Fall through to heuristic
  }
  return heuristicDomainDetection(text);
}

function heuristicDomainDetection(schemaText: string): DomainContext {
  const lower = schemaText.toLowerCase();
  let domain: BusinessDomain = 'generic';
  let market: MarketRegion = 'global';

  // Domain detection by keyword
  if (lower.includes('order') && lower.includes('product') && lower.includes('cart')) domain = 'ecommerce';
  else if (lower.includes('patient') && lower.includes('doctor') && lower.includes('appointment')) domain = 'healthcare';
  else if (lower.includes('parcel') && lower.includes('shipment') && lower.includes('delivery')) domain = 'logistics';
  else if (lower.includes('account') && lower.includes('transaction') && lower.includes('balance')) domain = 'fintech';
  else if (lower.includes('post') && lower.includes('comment') && lower.includes('like')) domain = 'social';
  else if (lower.includes('course') && lower.includes('student') && lower.includes('enrollment')) domain = 'education';
  else if (lower.includes('employee') && lower.includes('department') && lower.includes('salary')) domain = 'hr';
  else if (lower.includes('subscription') && lower.includes('plan') && lower.includes('tenant')) domain = 'saas';
  else if (lower.includes('menu') && lower.includes('reservation') && lower.includes('table')) domain = 'restaurant';
  else if (lower.includes('property') && lower.includes('listing') && lower.includes('agent')) domain = 'realestate';

  // Market detection
  if (lower.includes('phuong') || lower.includes('quan') || lower.includes('cccd') || lower.includes('vnd') || lower.includes('ho_ten') || lower.includes('dien_thoai')) {
    market = 'vietnam';
  }

  return {
    domain,
    market,
    language: market === 'vietnam' ? 'vi' : 'en',
    locale: market === 'vietnam' ? 'vi-VN' : 'en-US',
    tables: [],
    hints: {},
  };
}
