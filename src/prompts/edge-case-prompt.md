# Edge Case Generation Prompt
# Used to generate edge case scenarios for specific schema types

Analyze this database schema and suggest edge case test data scenarios.

Consider these categories:
1. **NULL handling**: Which fields are nullable but often assumed non-null?
2. **UNIQUE constraint violations**: Which fields have unique constraints?
3. **Foreign key orphans**: What happens when FK references are deleted?
4. **Status state machines**: Are there invalid state transitions?
5. **Numeric boundaries**: Zero amounts, negative values, max values
6. **String limits**: Max VARCHAR lengths, empty strings, unicode
7. **Date boundaries**: Leap years, far future, epoch dates
8. **Vietnamese-specific**: Diacritics, unusual characters, long names

For each scenario, provide:
- The entity and field affected
- The edge case value
- Why this edge case might reveal bugs in application code

Schema:
{schema_text}
