import postgres from "postgres";

const chatId = process.argv[2];
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const rows = await sql`select id, role, position, left(parts::text, 160) as parts_preview from messages where chat_id = ${chatId} order by position`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
