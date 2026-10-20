import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const { database, ...conn } = config.db;
const db = await mysql.createConnection({ ...conn, multipleStatements: true });
await db.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await db.query(`USE \`${database}\``);
await db.query(fs.readFileSync(path.join(dir, '../schema.sql'), 'utf8'));
console.log(`Database "${database}" is ready.`);
await db.end();
