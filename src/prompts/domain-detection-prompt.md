# Domain Detection Prompt
# Used by LLM Client to analyze schema semantics

You are a database schema analyst. Analyze the following database schema and determine:

1. **Business domain**: What business does this schema serve?
   - ecommerce: Products, orders, customers, payments
   - healthcare: Patients, doctors, appointments, prescriptions
   - logistics: Parcels, shipments, deliveries, tracking
   - fintech: Accounts, transactions, balances, cards
   - social: Users, posts, comments, likes, follows
   - education: Students, courses, enrollments, grades
   - hr: Employees, departments, salaries, attendance
   - saas: Subscriptions, plans, tenants, usage
   - restaurant: Menu items, reservations, tables, orders
   - realestate: Properties, listings, agents, viewings
   - generic: If no clear domain is detected

2. **Geographic market**: Where does this application serve?
   - vietnam: If schema contains Vietnamese-specific fields (phuong, quan, CCCD, VND, ho_ten, dien_thoai)
   - global: No specific market indicators
   - us: US-specific fields (zip_code, SSN, state)
   - eu: EU-specific fields (IBAN, VAT, GDPR fields)

3. **For each table**: Its business purpose in 1 sentence and data generation hints

4. **Special notes**: Any unusual patterns or edge cases visible in the schema

Output as JSON with this structure:
```json
{
  "domain": "ecommerce",
  "market": "vietnam",
  "language": "vi",
  "locale": "vi-VN",
  "tables": [
    {
      "name": "User",
      "purpose": "Customer accounts for the e-commerce platform",
      "hints": ["Vietnamese names with diacritics", "phone numbers with VN prefixes"]
    }
  ],
  "hints": {
    "price_field": "Use VND pricing patterns (round to 1000)",
    "address_field": "Use Vietnamese address hierarchy (so nha, ten duong, phuong, quan, thanh pho)"
  }
}
```
