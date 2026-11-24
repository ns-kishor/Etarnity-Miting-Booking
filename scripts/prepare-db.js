const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || '';
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

  if (isPostgres) {
    if (schema.includes('provider = "sqlite"')) {
      schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
      fs.writeFileSync(schemaPath, schema);
      console.log('[prepare-db] Switched Prisma provider to PostgreSQL for cloud database');
    }
  } else {
    if (schema.includes('provider = "postgresql"')) {
      schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
      fs.writeFileSync(schemaPath, schema);
      console.log('[prepare-db] Switched Prisma provider to SQLite / libSQL');
    }
  }
}
