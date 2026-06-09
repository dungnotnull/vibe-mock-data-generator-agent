/**
 * Text Generator — Domain-aware text generation via Ollama
 * Generates product descriptions, reviews, support tickets, etc.
 * Falls back to Faker when Ollama is unavailable.
 */

import { OllamaClient } from './ollama-client.js';

const OLLAMA_PROMPTS = {
  productDescription: (name: string, category: string) =>
    'Vi\u1EBFt m\u00F4 t\u1EA3 s\u1EA3n ph\u1EA9m ti\u1EBFng Vi\u1EC7t ng\u1EAFn g\u1ECDn cho: "' + name + '" (danh m\u1EE5c: ' + category + ').\nY\u00EAu c\u1EA7u: 2-3 c\u00E2u, t\u1EF1 nhi\u00EAn nh\u01B0 tr\u00EAn s\u00E0n th\u01B0\u01A1ng m\u1EA1i \u0111i\u1EC7n t\u1EED, kh\u00F4ng d\u00F9ng markdown.',

  customerReview: (productName: string, rating: number) => {
    const tone = rating >= 4 ? 'h\u00E0i l\u00F2ng v\u00E0 t\u00EDch c\u1EF1c' : rating >= 3 ? 'b\u00ECnh th\u01B0\u1EDDng, trung l\u1EADp' : 'kh\u00F4ng h\u00E0i l\u00F2ng';
    return 'Vi\u1EBFt m\u1ED9t \u0111\u00E1nh gi\u00E1 kh\u00E1ch h\u00E0ng ti\u1EBFng Vi\u1EC7t (' + rating + '/5 sao) cho s\u1EA3n ph\u1EA9m "' + productName + '".\nGi\u1ECDng v\u0103n: ' + tone + '. Kho\u1EA3ng 1-3 c\u00E2u. T\u1EF1 nhi\u00EAn nh\u01B0 ng\u01B0\u1EDDi th\u1EADt vi\u1EBFt.';
  },

  supportTicket: (issue: string) =>
    'Vi\u1EBFt n\u1ED9i dung y\u00EAu c\u1EA7u h\u1ED7 tr\u1EE3 c\u1EE7a kh\u00E1ch h\u00E0ng v\u1EC1 v\u1EA5n \u0111\u1EC1: "' + issue + '".\n1-2 c\u00E2u ng\u1EAFn g\u1ECDn, ti\u1EBFng Vi\u1EC7t th\u00F4ng th\u01B0\u1EDDng, kh\u00F4ng formal qu\u00E1.',

  addressNote: () =>
    'T\u1EA1o m\u1ED9t ghi ch\u00FA giao h\u00E0ng ng\u1EAFn b\u1EB1ng ti\u1EBFng Vi\u1EC7t. V\u00ED d\u1EE5: "G\u1ECDi tr\u01B0\u1EDBc 30 ph\u00FAt", "\u0110\u1EC3 t\u1EA1i b\u1EA3o v\u1EC7", "Giao gi\u1EDD h\u00E0nh ch\u00EDnh".\nCh\u1EC9 c\u1EA7n 1 c\u00E2u ng\u1EAFn, kh\u00F4ng qu\u00E1 20 t\u1EEB.',

  productName: (category: string) =>
    'T\u1EA1o m\u1ED9t t\u00EAn s\u1EA3n ph\u1EA9m th\u1EF1c t\u1EBF b\u1EB1ng ti\u1EBFng Vi\u1EC7t cho danh m\u1EE5c: ' + category + '.\nNg\u1EAFn g\u1ECDn (3-7 t\u1EEB), nh\u01B0 tr\u00EAn Shopee/Lazada. Ch\u1EC9 t\u00EAn, kh\u00F4ng m\u00F4 t\u1EA3 th\u00EAm.',
};

export async function generateProductDescriptions(
  products: Array<{ name: string; category: string }>,
  client: OllamaClient,
): Promise<string[]> {
  const prompts = products.map(p => OLLAMA_PROMPTS.productDescription(p.name, p.category));
  return client.generateBatch(prompts);
}

export async function generateCustomerReviews(
  reviews: Array<{ productName: string; rating: number }>,
  client: OllamaClient,
): Promise<string[]> {
  const prompts = reviews.map(r => OLLAMA_PROMPTS.customerReview(r.productName, r.rating));
  return client.generateBatch(prompts);
}

export async function generateSupportTickets(
  issues: string[],
  client: OllamaClient,
): Promise<string[]> {
  const prompts = issues.map(issue => OLLAMA_PROMPTS.supportTicket(issue));
  return client.generateBatch(prompts);
}

export { OLLAMA_PROMPTS };
