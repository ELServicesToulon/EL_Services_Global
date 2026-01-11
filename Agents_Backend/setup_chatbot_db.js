const { Client } = require('ssh2');
require('dotenv').config();

const conn = new Client();

// SQL command to create table and policy
// We use "CREATE TABLE IF NOT EXISTS" to correspond to the task
const sql = `
CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    sender text,
    content text,
    session_id text
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON chat_messages;
CREATE POLICY "Public Access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
`;

console.log('Connecting to VPS...');

conn.on('ready', () => {
  console.log('Client :: ready');
  // Escape single quotes in SQL for the bash command
  const cleanSql = sql.replace(/'/g, "'\\''").replace(/\n/g, ' ');
  const cmd = `docker exec -i supabase-db psql -U postgres -d postgres -c '${cleanSql}'`;
  
  console.log('Executing:', cmd);

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
    console.error('Connection Error:', err);
}).connect({
  host: process.env.VPS_HOST,
  port: 22,
  username: process.env.VPS_USER,
  password: process.env.VPS_PASS,
  readyTimeout: 20000 
});
