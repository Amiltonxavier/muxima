/**
 * Audits schema.prisma against the real PostgreSQL structure:
 * tables, columns (incl. @map renames) and enum types/values.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/server/.env") });

const schemaDir = path.resolve(__dirname, "../prisma/schema");
const schema = fs
	.readdirSync(schemaDir)
	.filter((f) => f.endsWith(".prisma"))
	.map((f) => fs.readFileSync(path.join(schemaDir, f), "utf8"))
	.join("\n");

// ── Parse schema.prisma (models + enums, incl. @map/@@map) ────────
function parseSchema(src) {
	const models = new Map();
	const enums = new Map();

	const blockRe = /^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
	for (const match of src.matchAll(blockRe)) {
		const [, kind, name, body] = match;
		if (kind === "model") {
			let table = name;
			const mapMatch = body.match(/@@map\(\s*"([^"]+)"\s*\)/);
			if (mapMatch) table = mapMatch[1];

			const columns = [];
			for (const rawLine of body.split("\n")) {
				const line = rawLine.trim();
				if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
				const fm = line.match(/^(\w+)\s+([A-Za-z[\]?0-9.]+)(.*)$/);
				if (!fm) continue;
				const [, fieldName, rawType, rest] = fm;
				const type = rawType.replace(/\?$/, ""); // strip optionality
				// Skip relation fields (object types / lists) — they are FKs, not scalar columns				if (rest.includes("@relation")) continue;
				if (type.endsWith("[]")) continue;
				let col = fieldName;
				const colMap = rest.match(/@map\(\s*"([^"]+)"\s*\)/);
				if (colMap) col = colMap[1];
				columns.push({
					fieldName,
					column: col,
					type,
					optional: rest.includes("?"),
				});
			}
			models.set(table, { name, columns });
		} else {
			const values = body
				.split("\n")
				.map((l) => l.trim())
				.filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"));
			let enumName = name;
			const mapMatch = body.match(/@@map\(\s*"([^"]+)"\s*\)/);
			if (mapMatch) enumName = mapMatch[1];
			enums.set(enumName, values);
		}
	}
	return { models, enums };
}

const { models, enums } = parseSchema(schema);
// Two-pass: drop fields whose type refers to another model (reverse relations
// like `budget Budget?` have no @relation on the same line).
const modelNames = new Set([...models.values()].map((m) => m.name));
for (const [, model] of models) {
	model.columns = model.columns.filter((c) => !modelNames.has(c.type));
}

// ── Introspect database ───────────────────────────────────────────
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const problems = [];
try {
	const dbTables = await client.query(
		`SELECT table_name FROM information_schema.tables
		 WHERE table_schema='public' AND table_type='BASE TABLE'
		 ORDER BY table_name;`,
	);
	const dbTableSet = new Set(
		dbTables.rows
			.map((r) => r.table_name)
			// Prisma's own bookkeeping table, not part of the datamodel
			.filter((t) => t !== "_prisma_migrations"),
	);

	for (const [table, model] of models) {
		if (!dbTableSet.has(table)) {
			problems.push(`TABLE MISSING in DB: ${table} (model ${model.name})`);
			continue;
		}
		const colsRes = await client.query(
			`SELECT column_name FROM information_schema.columns
			 WHERE table_schema='public' AND table_name=$1;`,
			[table],
		);
		const dbCols = new Set(colsRes.rows.map((r) => r.column_name));
		for (const col of model.columns) {
			if (!dbCols.has(col.column)) {
				problems.push(
					`COLUMN MISSING in DB: ${table}.${col.column} (field ${model.name}.${col.fieldName}: ${col.type})`,
				);
			}
		}
	}

	// Extra tables in DB not present in schema
	for (const table of dbTableSet) {
		if (!models.has(table)) problems.push(`TABLE EXTRA in DB: ${table}`);
	}

	// Enums
	const enumTypes = await client.query(
		`SELECT t.typname AS name, e.enumlabel AS value
		 FROM pg_type t
		 JOIN pg_enum e ON e.enumtypid = t.oid
		 JOIN pg_namespace n ON n.oid = t.typnamespace
		 WHERE n.nspname='public'
		 ORDER BY t.typname, e.enumsortorder;`,
	);
	const dbEnums = new Map();
	for (const r of enumTypes.rows) {
		if (!dbEnums.has(r.name)) dbEnums.set(r.name, []);
		dbEnums.get(r.name).push(r.value);
	}
	for (const [name, values] of enums) {
		if (!dbEnums.has(name)) {
			problems.push(`ENUM TYPE MISSING in DB: ${name} [${values.join(", ")}]`);
			continue;
		}
		const dbVals = dbEnums.get(name);
		for (const v of values) {
			if (!dbVals.includes(v))
				problems.push(`ENUM VALUE MISSING: ${name}.${v}`);
		}
		for (const v of dbVals) {
			if (!values.includes(v)) problems.push(`ENUM VALUE EXTRA: ${name}.${v}`);
		}
	}
	for (const name of dbEnums.keys()) {
		if (!enums.has(name)) problems.push(`ENUM TYPE EXTRA in DB: ${name}`);
	}

	if (problems.length === 0) {
		console.log("✅ schema.prisma and PostgreSQL are fully aligned.");
	} else {
		console.log(`❌ ${problems.length} divergence(s) found:\n`);
		for (const p of problems) console.log(`  - ${p}`);
	}
} finally {
	await client.end();
}
