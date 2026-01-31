const DEFAULT_DEV_SCHEMA_QUALIFIER = "";
const DEFAULT_PROD_SCHEMA_QUALIFIER = "prod.";

function resolveSchemaQualifier() {
  const explicit = String(process.env.DATABASE_SCHEMA_QUALIFIER || "").trim();
  if (explicit) return explicit;
  return process.env.NODE_ENV === "production" ? DEFAULT_PROD_SCHEMA_QUALIFIER : DEFAULT_DEV_SCHEMA_QUALIFIER;
}

module.exports = { resolveSchemaQualifier };

