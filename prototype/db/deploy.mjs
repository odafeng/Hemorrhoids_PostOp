import pg from 'pg';
import fs from 'fs';

const sql = fs.readFileSync('/Users/huangshifeng/Desktop/痔瘡AI 衛教/prototype/db/schema.sql', 'utf8');

// Try multiple connection approaches
const configs = [
  {
    name: 'Supabase Session Mode (port 5432)',
    connectionString: 'postgresql://postgres:acIHyq8L4OLD1MwB@db.krohucxzthnukbuzfwiu.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Supabase Pooler (port 6543)',
    connectionString: 'postgresql://postgres.krohucxzthnukbuzfwiu:acIHyq8L4OLD1MwB@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'User-provided Database URL',
    connectionString: 'postgresql://postgres:acIHyq8L4OLD1MwB@db.krohucxzthnukbuzfwiu.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  },
];

for (const config of configs) {
  console.log(`\nTrying: ${config.name}...`);
  const client = new pg.Client({ connectionString: config.connectionString, ssl: config.ssl, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    console.log('✅ Connected!');
    console.log('Executing schema...');
    await client.query(sql);
    console.log('✅ Schema deployed successfully!');

    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;
    `);
    console.log('\nCreated tables:');
    res.rows.forEach(r => console.log('  •', r.table_name));

    const rls = await client.query(`
      SELECT tablename, rowsecurity FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('pii_patients','pii_access_log','patients','symptom_reports','alerts','ai_chat_logs','healthcare_utilization','usability_surveys')
      ORDER BY tablename;
    `);
    console.log('\nRLS status:');
    rls.rows.forEach(r => console.log('  •', r.tablename, '→', r.rowsecurity ? '✅ RLS ON' : '❌ RLS OFF'));

    await client.end();
    process.exit(0);
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    try { await client.end(); } catch(e) {}
  }
}

console.log('\n⚠️  All connection attempts failed.');
console.log('Please deploy manually via Supabase Dashboard SQL Editor:');
console.log('https://supabase.com/dashboard/project/krohucxzthnukbuzfwiu/sql/new');
process.exit(1);
