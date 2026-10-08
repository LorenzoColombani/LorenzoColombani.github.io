/**
 * loot-definitions.js — Master Item Catalog (Sessions 1–12 + Python Vault Runner)
 *
 * Every collectable item across all tutorials.  Items are organised into
 * five categories and keyed by a stable slug so that persistence,
 * drop-tables, and UI code can all reference the same identifiers.
 *
 * Pattern: ES5-safe, single global namespace via window.SV.
 */

var SV = window.SV || {};

/* ------------------------------------------------------------------ */
/*  Categories                                                        */
/* ------------------------------------------------------------------ */

SV.CATEGORIES = {
  sql: {
    name: 'SQL Toolkit',
    icon: '\uD83D\uDCBB',          // 💻
    color: '#30d158',
    glow: 'rgba(48,209,88,0.4)'
  },
  dv: {
    name: 'Data Vault Blueprints',
    icon: '\uD83D\uDD37',          // 🔷
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.4)'
  },
  compliance: {
    name: 'Compliance Archives',
    icon: '\uD83D\uDEE1',         // 🛡
    color: '#af52de',
    glow: 'rgba(175,82,222,0.4)'
  },
  mastery: {
    name: 'Concept Mastery',
    icon: '\uD83C\uDF99',         // 🎙
    color: '#ffd700',
    glow: 'rgba(255,215,0,0.4)'
  },
  tools: {
    name: 'Tools and Concepts',
    icon: '\uD83D\uDD27',         // 🔧
    color: '#64d2ff',
    glow: 'rgba(100,210,255,0.4)'
  },
  python: {
    name: 'Python Toolkit',
    icon: '\uD83D\uDC0D',         // 🐍
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.4)'
  }
};

/* ------------------------------------------------------------------ */
/*  All Items                                                         */
/* ------------------------------------------------------------------ */

SV.ALL_ITEMS = {

  /* ── Chapter 1 — Relational Foundations ────────────────────────── */

  'table-vs-row': {
    name: 'Table vs Row',
    cat: 'sql',
    session: 1,
    desc: 'A table is a structure (like a character sheet template). A row is one filled-in sheet.'
  },
  'primary-key': {
    name: 'Primary Key',
    cat: 'sql',
    session: 1,
    desc: 'The column(s) that uniquely identify each row. No two rows can share the same PK value.'
  },
  'entity-noun': {
    name: 'Entity = Noun, Attribute = Adj',
    cat: 'tools',
    session: 1,
    desc: 'Entities are the nouns (Character, Faction). Attributes are the adjectives (name, level).'
  },

  /* ── Chapter 2 — Data Vault ───────────────────────────────────── */

  'hub-blueprint': {
    name: 'Hub Blueprint',
    cat: 'dv',
    session: 2,
    desc: 'Stores unique business entities \u2014 one row per entity, ever. 4 columns: hash key, business key, load date, record source.'
  },
  'satellite-blueprint': {
    name: 'Satellite Blueprint',
    cat: 'dv',
    session: 2,
    desc: 'Tracks how entity attributes change over time. Composite PK (hash key + load date). One new row per change.'
  },
  'link-blueprint': {
    name: 'Link Blueprint',
    cat: 'dv',
    session: 2,
    desc: 'Records relationships between entities. Contains its own hash key + connected Hub hash keys. No descriptive data.'
  },
  'vault-architecture': {
    name: 'Raw \u2192 Business \u2192 Mart',
    cat: 'tools',
    session: 2,
    desc: 'Raw Vault = exact copy in DV structure. Business Vault = business rules. Information Mart = consumer-shaped.'
  },

  /* ── Chapter 3 — SQL Part 1 ───────────────────────────────────── */

  'select-clause': {
    name: 'SELECT Clause',
    cat: 'sql',
    session: 3,
    desc: 'Picks which columns to show. SELECT * = all columns. Always first in a query.'
  },
  'from-clause': {
    name: 'FROM Clause',
    cat: 'sql',
    session: 3,
    desc: 'Names the table to read from. Can alias: FROM Hub_Character AS h.'
  },
  'where-clause': {
    name: 'WHERE Clause',
    cat: 'sql',
    session: 3,
    desc: 'Filters rows. Only rows where condition is TRUE appear in results.'
  },
  'three-valued-logic': {
    name: 'Three-Valued Logic',
    cat: 'sql',
    session: 3,
    desc: 'SQL has TRUE, FALSE, NULL. NULL = unknown. Use IS NULL, not = NULL.'
  },

  /* ── Chapter 4 — JOINs ────────────────────────────────────────── */

  'inner-join': {
    name: 'INNER JOIN',
    cat: 'sql',
    session: 4,
    desc: 'Returns only rows that match in both tables. The strictest JOIN.'
  },
  'left-join': {
    name: 'LEFT JOIN',
    cat: 'sql',
    session: 4,
    desc: 'Returns all rows from left table, plus matching rows from right. No match = NULL.'
  },
  'on-clause': {
    name: 'ON Clause',
    cat: 'sql',
    session: 4,
    desc: 'Specifies HOW two tables connect. ON h.hub_character_hk = s.hub_character_hk.'
  },
  'alias-assignment': {
    name: 'Alias Assignment',
    cat: 'sql',
    session: 4,
    desc: 'Gives a table a short name. FROM Hub_Character AS h \u2014 henceforth called h.'
  },
  'dot-notation': {
    name: 'Dot Notation',
    cat: 'sql',
    session: 4,
    desc: 'owner.property \u2014 like a possessive. h.business_key = h\'s business_key.'
  },

  /* ── Chapter 5 — GDPR ─────────────────────────────────────────── */

  'gdpr-fundamentals': {
    name: 'GDPR Fundamentals',
    cat: 'compliance',
    session: 5,
    desc: 'EU regulation (May 2018). Rights-based: consent, purpose limitation, data minimization, right to erasure.'
  },
  'data-subject-rights': {
    name: 'Data Subject Rights',
    cat: 'compliance',
    session: 5,
    desc: 'Right to access, rectification, erasure, portability, restriction, objection.'
  },
  'data-mesh-concept': {
    name: 'Data Mesh',
    cat: 'tools',
    session: 5,
    desc: 'Decentralized data architecture. Each domain owns its data as a product.'
  },

  /* ── Chapter 6 — dbt / Tools ──────────────────────────────────── */

  'dbt-model': {
    name: 'dbt Model',
    cat: 'tools',
    session: 6,
    desc: 'A SQL SELECT saved as a .sql file. dbt compiles and runs it to produce a table or view. NOT a DV model.'
  },
  'elt-vs-etl': {
    name: 'ELT vs ETL',
    cat: 'tools',
    session: 6,
    desc: 'ETL = transform before loading. ELT = load raw, transform in warehouse. dbt enables ELT.'
  },
  'datavault4dbt': {
    name: 'DataVault4dbt',
    cat: 'tools',
    session: 6,
    desc: 'Open-source dbt package for Data Vault automation. Write a 7-line model file, macro generates full INSERT SQL.'
  },
  'snowflake': {
    name: 'Snowflake',
    cat: 'tools',
    session: 6,
    desc: 'Cloud data warehouse (SaaS). Separation of storage and compute. Pay per query.'
  },

  /* ── Chapter 7 — Regulations ──────────────────────────────────── */

  'eu-data-act': {
    name: 'EU Data Act',
    cat: 'compliance',
    session: 7,
    desc: 'Regulates data sharing between businesses. IoT data and cloud portability. Broader than GDPR.'
  },
  'dora': {
    name: 'DORA',
    cat: 'compliance',
    session: 7,
    desc: 'Digital Operational Resilience Act. Financial sector. ICT risk management, incident reporting.'
  },
  'eprivacy': {
    name: 'ePrivacy',
    cat: 'compliance',
    session: 7,
    desc: 'Cookie consent and electronic communications privacy. Complements GDPR.'
  },

  /* ── Chapter 8 — Mechanisms ───────────────────────────────────── */

  'data-sovereignty': {
    name: 'Data Sovereignty',
    cat: 'compliance',
    session: 8,
    desc: 'Three dimensions: physical location, legal jurisdiction, operational control.'
  },
  'cross-border-transfers': {
    name: 'Cross-Border Transfers',
    cat: 'compliance',
    session: 8,
    desc: 'Moving data outside EU. Requires adequacy decision, SCCs, or BCRs. Schrems II.'
  },
  'iso-27001': {
    name: 'ISO 27001',
    cat: 'compliance',
    session: 8,
    desc: 'International standard for ISMS. Certifiable. The framework for security management.'
  },
  'soc-2': {
    name: 'SOC 2',
    cat: 'compliance',
    session: 8,
    desc: 'US-origin audit report (not certification). Five trust principles: security, availability, etc.'
  },

  /* ── Chapter 8.5 — AI Act ─────────────────────────────────────── */

  'ai-risk-tiers': {
    name: 'AI Act Risk Tiers',
    cat: 'compliance',
    session: 8.5,
    desc: 'Four tiers: Unacceptable, High-risk, Limited, Minimal. Classification determines obligations.'
  },
  'provider-deployer': {
    name: 'Provider vs Deployer',
    cat: 'compliance',
    session: 8.5,
    desc: 'Provider = builds AI. Deployer = uses it. Different obligations. Most companies are deployers.'
  },
  'ai-spaghetti': {
    name: 'AI Spaghetti Problem',
    cat: 'compliance',
    session: 8.5,
    desc: 'AI systems ingest data from everywhere with no lineage. DV solves this: hash keys trace every record.'
  },

  /* ── Chapter 10 — CREATE TABLE ─────────────────────────────────── */

  'create-table': {
    name: 'CREATE TABLE',
    cat: 'sql',
    session: 9,
    desc: 'DDL \u2014 defines table structure. Runs once. Columns, types, constraints, PK.'
  },
  'data-types': {
    name: 'Data Types',
    cat: 'sql',
    session: 9,
    desc: 'CHAR(n) = fixed length. VARCHAR(n) = variable. INTEGER = whole numbers. TIMESTAMP = date+time.'
  },
  'constraints': {
    name: 'Constraints',
    cat: 'sql',
    session: 9,
    desc: 'NOT NULL = cannot be empty. PRIMARY KEY = uniquely identifies each row.'
  },
  'count-group-by': {
    name: 'COUNT / GROUP BY',
    cat: 'sql',
    session: 9,
    desc: 'COUNT(*) = how many rows. GROUP BY = count per category.'
  },
  'hub-create-table': {
    name: 'Hub Schema (CREATE TABLE)',
    cat: 'dv',
    session: 9,
    desc: '4 columns: hash key CHAR(64), business_key VARCHAR(255), load_date TIMESTAMP, record_source VARCHAR(100). All NOT NULL.'
  },
  'sat-create-table': {
    name: 'Satellite Schema (CREATE TABLE)',
    cat: 'dv',
    session: 9,
    desc: 'Composite PK (hash_key + load_date), hash_diff CHAR(64), descriptive columns (nullable). No load_end_date in v0.'
  },
  'link-create-table': {
    name: 'Link Schema (CREATE TABLE)',
    cat: 'dv',
    session: 9,
    desc: 'Own hash key + hub hash keys for connected entities + load_date + record_source. 5 columns.'
  },

  /* ── Chapter 11 — dbt/Jinja Reading (discovered via exercises) ── */

  'jinja-templating': {
    name: 'Jinja Templating',
    cat: 'tools',
    session: 10,
    desc: 'Jinja is mail merge for SQL. {{ }} = output, {% %} = logic, {# #} = comment. Template + data = compiled SQL.'
  },
  'dbt-compilation': {
    name: 'dbt Compilation',
    cat: 'tools',
    session: 10,
    desc: 'dbt compile: Jinja template \u2192 pure SQL. The model file is the recipe; compiled SQL is the finished dish.'
  },
  'config-ref-source': {
    name: 'config / ref / source',
    cat: 'tools',
    session: 10,
    desc: 'config() = how to build. ref() = link to another model. source() = link to raw table. The three dbt verbs.'
  },

  /* ── Chapter 12 — Integration Day + Python Reading ───────────── */

  'python-reading': {
    name: 'Python Reading',
    cat: 'tools',
    session: 11,
    desc: 'Can read Python basics in dbt files: variables, strings, lists, dictionaries. Reading only \u2014 not writing.'
  },
  'mini-vault': {
    name: 'Mini Vault',
    cat: 'dv',
    session: 11,
    desc: 'Built a complete Data Vault from scratch: 2 Hubs, 1 Link, 2 Satellites. INSERT + JOIN. End-to-end.'
  },
  'mini-vault-structure': {
    name: 'Vault Architecture (Built)',
    cat: 'dv',
    session: 11,
    desc: 'Wrote CREATE TABLE for 2 Hubs, 1 Link, 2 Satellites from memory. The vault structure is yours.'
  },
  'insert-mastery': {
    name: 'INSERT INTO',
    cat: 'sql',
    session: 11,
    desc: 'Can write INSERT statements for Hub, Link, and Satellite. Understands dependency order.'
  },
  'multi-join-query': {
    name: 'Multi-Table JOIN',
    cat: 'sql',
    session: 11,
    desc: 'Wrote a 4-table JOIN query from scratch: Hub \u2192 Link \u2192 Hub \u2192 Satellite. Hash keys are the rails.'
  },
  'end-to-end-vault': {
    name: 'End-to-End Vault',
    cat: 'mastery',
    session: 11,
    desc: 'Built a complete Data Vault: CREATE, INSERT, and JOIN. Can walk through the whole chain.'
  },

  /* ── Concept Mastery (unlocked across sessions) ─────────────── */

  'career-story': {
    name: 'Learning Journey',
    cat: 'mastery',
    session: 1,
    desc: 'A structured narrative connecting foundational concepts to practical application.'
  },
  'dv-elevator-pitch': {
    name: 'DV Elevator Pitch',
    cat: 'mastery',
    session: 2,
    desc: 'Can explain Data Vault in 30 seconds: Hubs = entities, Links = relationships, Satellites = history.'
  },
  'compliance-differentiator': {
    name: 'Compliance Differentiator',
    cat: 'mastery',
    session: 5,
    desc: 'Compliance expertise combined with Data Vault knowledge.'
  },
  'sql-confidence': {
    name: 'SQL Confidence',
    cat: 'mastery',
    session: 9,
    desc: 'Can write Hub, Link, Satellite CREATE TABLE from scratch. Understands every column and constraint.'
  },
  'tools-landscape': {
    name: 'Tools Landscape',
    cat: 'mastery',
    session: 6,
    desc: 'dbt + Snowflake + DataVault4dbt. Knows the ELT stack and how consultancies use it.'
  },
  'regulation-map': {
    name: 'Regulation Map',
    cat: 'mastery',
    session: 7,
    desc: 'GDPR, EU Data Act, DORA, ePrivacy, AI Act \u2014 knows which applies when and how DV supports each.'
  },
  'ai-act-edge': {
    name: 'AI Act Edge',
    cat: 'mastery',
    session: 8.5,
    desc: 'Article 10 \u2192 DV mapping. AI Spaghetti problem. Provider vs Deployer. A key differentiator.'
  },

  /* ── Chapter 11 — SQL Practice ────────────────────────────────── */

  'symbol-discrimination': {
    name: 'Symbol Discrimination',
    cat: 'sql',
    session: 10,
    desc: '* vs %, . vs _, single vs double quotes, != vs <>. Automatic retrieval under pressure.'
  },
  'schema-from-memory': {
    name: 'Schema From Memory',
    cat: 'dv',
    session: 10,
    desc: 'Wrote Hub, Link, Satellite CREATE TABLE from scratch without reference.'
  },
  'dbt-model-reading': {
    name: 'dbt Model Reading',
    cat: 'tools',
    session: 10,
    desc: 'Can read a datavault4dbt model file and explain what SQL it generates.'
  },
  'where-not-exists': {
    name: 'WHERE NOT EXISTS',
    cat: 'sql',
    session: 10,
    desc: 'The insert-only guard. Only insert if hash key does not already exist.'
  },
  'compiled-sql-reading': {
    name: 'Compiled SQL Reading',
    cat: 'tools',
    session: 10,
    desc: 'Can read datavault4dbt-generated SQL and explain each part.'
  },

  /* ── Chapter 13 — Compliance Self-Test ──────────────────────────── */

  'gdpr-erasure-workflow': {
    name: 'GDPR Erasure Workflow',
    cat: 'compliance',
    session: 12,
    desc: 'Multi-layer deletion: map data across Staging \u2192 Raw Vault \u2192 Business Vault \u2192 Marts \u2192 Backups. DELETE PII Satellite + INSERT tombstone.'
  },
  'pii-satellite-pattern': {
    name: 'PII Satellite Pattern',
    cat: 'dv',
    session: 12,
    desc: 'Isolate personal data in a dedicated Satellite for deletability. Hub stays; PII Satellite rows get deleted + tombstoned.'
  },
  'artificial-hub-pattern': {
    name: 'Artificial Hub Pattern',
    cat: 'dv',
    session: 12,
    desc: 'Synthetic surrogate key replaces PII as Hub business key. Makes Hub non-personal data. GDPR compliance by design.'
  },
  'tombstone-record': {
    name: 'Tombstone Record',
    cat: 'compliance',
    session: 12,
    desc: 'Audit trail entry after PII deletion. Records WHAT was deleted, WHEN, WHO authorized it \u2014 without retaining the PII itself.'
  },
  'dora-temporal-query': {
    name: 'DORA Temporal Query',
    cat: 'compliance',
    session: 12,
    desc: 'Reconstruct exact state at any timestamp via load_date + record_source + insert-only design. PIT tables accelerate it.'
  },
  'data-sovereignty-3d': {
    name: 'Data Sovereignty (3D)',
    cat: 'compliance',
    session: 12,
    desc: 'Three dimensions: physical location, legal jurisdiction, operational control. Servers in Germany \u2260 sovereignty if provider is US-headquartered.'
  },
  'dual-compliance': {
    name: 'Dual Compliance',
    cat: 'compliance',
    session: 12,
    desc: 'AI Act + GDPR compound rather than conflict. AI Act enables processing; GDPR constrains how. Both apply simultaneously.'
  },
  'consultant-framing': {
    name: 'Consultant Framing',
    cat: 'mastery',
    session: 12,
    desc: '"Here\'s how I\'d approach this as a consultant" \u2014 BI consultant voice, practical and solution-oriented.'
  },
  'trap-spotter-reflex': {
    name: 'Analytical Reflex',
    cat: 'mastery',
    session: 12,
    desc: '"I\'d want to think through the specifics..." The reflex that prevents confident wrong answers. A valuable analytical habit.'
  },
  'career-narrative': {
    name: 'Domain Narrative',
    cat: 'mastery',
    session: 12,
    desc: 'Connecting legal background to data engineering. A structured knowledge narrative.'
  },
  'cfo-compliance-pitch': {
    name: 'Business Case for Governance',
    cat: 'mastery',
    session: 12,
    desc: '"Lawyers tell you what the law requires. We build the system that proves you did it." Business case for governed DV.'
  },
  'data-mesh-governance': {
    name: 'Data Mesh Governance',
    cat: 'tools',
    session: 12,
    desc: 'Federated governance with centralized infrastructure. Raw Vault = centralized. Business Vault = domain-specific. DV makes Mesh governable.'
  },
  'audit-mastery': {
    name: 'Audit Framework Mastery',
    cat: 'compliance',
    session: 12,
    desc: 'ISO 27001 = certification. SOC 2 = US audit report. ISAE 3402 = EU audit report. Certification vs attestation.'
  },
  'self-test-complete': {
    name: 'Self-Test Complete',
    cat: 'mastery',
    session: 12,
    desc: 'Answered all compliance self-test questions across all categories.'
  },

  /* ── Chapter 14 — General Assessment ──────────────────────────────── */

  'dv-architecture-walkthrough': {
    name: 'DV Architecture Walkthrough',
    cat: 'dv', session: 13,
    desc: 'Source \u2192 Staging \u2192 Raw Vault \u2192 Business Vault \u2192 Marts \u2192 Reports. The full pipeline, narrated.'
  },
  'staging-not-vault': {
    name: 'Staging \u2260 Vault',
    cat: 'dv', session: 13,
    desc: 'Staging is the loading dock BEFORE the vault. Not inside it. The vault is Raw + Business + Marts.'
  },
  'star-schema-contrast': {
    name: 'DV vs Star Schema',
    cat: 'dv', session: 13,
    desc: 'Star Schema = query-optimized. Data Vault = agility + auditability. Use DV for storage, Star Schema for marts.'
  },
  'satellite-split-design': {
    name: 'Satellite Split Design',
    cat: 'dv', session: 13,
    desc: 'Rate-of-change split: volatile attributes in one Sat, stable in another. PII Sat for GDPR deletability.'
  },
  'late-arriving-data-concept': {
    name: 'Late Arriving Data',
    cat: 'dv', session: 13,
    desc: 'Fact true at time T arrives at T+N. load_date \u2260 business date. Insert the row; PIT recalculates.'
  },
  'hub-load-sql-reading': {
    name: 'Hub Load SQL Reading',
    cat: 'sql', session: 13,
    desc: 'Read INSERT INTO hub ... SELECT DISTINCT SHA2(UPPER(TRIM(bk))) with WHERE NOT IN dedup guard.'
  },
  'sat-schema-reading': {
    name: 'Satellite Schema Reading',
    cat: 'sql', session: 13,
    desc: 'Read CREATE TABLE sat_customer_pii: composite PK (hk + load_date), hash_diff, nullable descriptives.'
  },
  'dbt-compilation-flow': {
    name: 'dbt Compilation Flow',
    cat: 'tools', session: 13,
    desc: 'YAML config \u2192 Jinja macro \u2192 compiled SQL. ref() resolves table names across environments.'
  },
  'elt-stack-clarity': {
    name: 'ELT Stack Clarity',
    cat: 'tools', session: 13,
    desc: 'Meltano extracts + loads. dbt transforms inside Snowflake. Cloud compute made ELT viable.'
  },
  'snowflake-is-saas': {
    name: 'Snowflake = SaaS',
    cat: 'tools', session: 13,
    desc: 'Cloud-native data warehouse. Runs ON AWS/Azure/GCP, not a cloud provider itself. Pay for storage + compute.'
  },
  'soc2-five-criteria': {
    name: 'SOC 2 Five Criteria',
    cat: 'compliance', session: 13,
    desc: 'Audit report (not certification). Security, Availability, Processing Integrity, Confidentiality, Privacy.'
  },
  'ai-act-tier-precision': {
    name: 'AI Act Tier Precision',
    cat: 'compliance', session: 13,
    desc: 'Prohibited (7%), High-risk (3%), Limited risk (transparency only), Minimal (no obligations). Official names.'
  },
  'dora-downstream-flow': {
    name: 'DORA Downstream Flow',
    cat: 'compliance', session: 13,
    desc: 'DORA applies to financial entities. ICT providers inherit obligations contractually via Art. 28.'
  },
  'career-story-60s': {
    name: '60-Second Knowledge Summary',
    cat: 'mastery', session: 13,
    desc: 'Legal foundations to data engineering to BI consulting. 60 seconds. A structured knowledge narrative.'
  },
  'general-mock-survivor': {
    name: 'Assessment Complete',
    cat: 'mastery', session: 13,
    desc: 'Completed the full general knowledge assessment across all domains.'
  },

  /* ── Python Vault Runner (standalone tutorial) ─────────────────── */

  'python-variable': {
    name: 'Python Variable',
    cat: 'python',
    session: 'pvr',
    desc: 'A name that points to a value. crew_name = "Burnham" \u2014 henceforth called crew_name.'
  },
  'python-data-types': {
    name: 'Python Data Types',
    cat: 'python',
    session: 'pvr',
    desc: 'str = text in quotes. int = whole number. bool = True/False. type() reveals what kind of thing it is.'
  },
  'python-dict': {
    name: 'Python Dictionary',
    cat: 'python',
    session: 'pvr',
    desc: 'Key-value pairs in curly braces. {"crew_id": "BURNHAM-001"} \u2014 like a single database row.'
  },
  'python-list': {
    name: 'Python List',
    cat: 'python',
    session: 'pvr',
    desc: 'Ordered collection in square brackets. crew = [burnham, saru, tilly] \u2014 like a result set.'
  },
  'python-key-access': {
    name: 'Key Access',
    cat: 'python',
    session: 'pvr',
    desc: 'burnham["rank"] \u2014 access a value by its key name. Like SELECT rank FROM crew WHERE crew_id = "BURNHAM-001".'
  },
  'python-result-set': {
    name: 'Result Set Pattern',
    cat: 'python',
    session: 'pvr',
    desc: 'A list of dicts IS the shape SQL returns in Python. Each dict = a row. Each key = a column name.'
  },
  'python-function': {
    name: 'Python Function',
    cat: 'python',
    session: 'pvr',
    desc: 'def function_name(inputs): Package reusable logic. Call it by name to run it.'
  },
  'python-format-function': {
    name: 'Format Function',
    cat: 'python',
    session: 'pvr',
    desc: 'Built a display formatter: def format_display(member). First function that produces visible output.'
  },
  'python-hash-key': {
    name: 'Hash Key Function',
    cat: 'python',
    session: 'pvr',
    desc: 'hashlib.sha256(bk.upper().strip().encode()).hexdigest() \u2014 the exact same logic datavault4dbt uses.'
  },
  'python-for-loop': {
    name: 'For Loop',
    cat: 'python',
    session: 'pvr',
    desc: 'for member in crew: Walk every item in a collection. "For each one belonging to this list."'
  },
  'python-filter': {
    name: 'Filter Pattern',
    cat: 'python',
    session: 'pvr',
    desc: 'for + if = filter. Walk the list, keep only rows matching a condition. Like WHERE in SQL.'
  },
  'python-random-choice': {
    name: 'Random Choice',
    cat: 'python',
    session: 'pvr',
    desc: 'random.choice(list) \u2014 picks one item at random. Different output every run. The game moment.'
  },
  'dbt-python-model': {
    name: 'dbt Python Model',
    cat: 'python',
    session: 'pvr',
    desc: 'def model(dbt, session): A Python function that dbt runs to produce a table. dbt.ref() = {{ ref() }}.'
  },
  'turbovault-metadata': {
    name: 'TurboVault4dbt Connection',
    cat: 'python',
    session: 'pvr',
    desc: 'TurboVault4dbt reads metadata and generates dbt model files. The Python you learned IS what runs behind the GUI.'
  },
  'feynman-close': {
    name: 'Feynman Close',
    cat: 'python',
    session: 'pvr',
    desc: 'Explained the full crew registry to an imaginary audience. If you can teach it, you understand it.'
  },
  'python-vault-runner-complete': {
    name: 'Python Vault Runner Complete',
    cat: 'mastery',
    session: 'pvr',
    desc: 'Completed all 15 missions. Built a crew registry from scratch in Python. Can read dbt Python models.'
  }
};

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                   */
/* ------------------------------------------------------------------ */

/** Return an array of item keys for a given session number. */
SV.itemsForSession = function (sessionNum) {
  var keys = [];
  var items = SV.ALL_ITEMS;
  for (var k in items) {
    if (items.hasOwnProperty(k) && items[k].session === sessionNum) {
      keys.push(k);
    }
  }
  return keys;
};

/** Return an array of item keys for a given category slug. */
SV.itemsForCategory = function (catSlug) {
  var keys = [];
  var items = SV.ALL_ITEMS;
  for (var k in items) {
    if (items.hasOwnProperty(k) && items[k].cat === catSlug) {
      keys.push(k);
    }
  }
  return keys;
};

window.SV = SV;
