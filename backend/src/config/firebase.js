import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectId = process.env.FIREBASE_PROJECT_ID || 'local-ai-assistant';
let db;
let isMock = false;

// Simple Local JSON Database Mock for Firestore
class MockFirestore {
  constructor(dbPath) {
    this.dbPath = dbPath;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '{}', 'utf8');
    }
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.dbPath, 'utf8') || '{}');
    } catch (e) {
      return {};
    }
  }

  _write(data) {
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
  }

  collection(colName) {
    const self = this;
    return {
      doc(docId) {
        return {
          async get() {
            const data = self._read();
            const col = data[colName] || {};
            const docData = col[docId];
            return {
              exists: !!docData,
              id: docId,
              data: () => docData ? JSON.parse(JSON.stringify(docData)) : undefined
            };
          },
          async set(newData, options = {}) {
            const data = self._read();
            if (!data[colName]) data[colName] = {};
            
            if (options.merge) {
              data[colName][docId] = { ...(data[colName][docId] || {}), ...newData };
            } else {
              data[colName][docId] = newData;
            }
            self._write(data);
            return { writeTime: new Date() };
          },
          async update(updateData) {
            const data = self._read();
            if (!data[colName] || !data[colName][docId]) {
              throw new Error(`Document "${docId}" does not exist in collection "${colName}".`);
            }
            data[colName][docId] = { ...data[colName][docId], ...updateData };
            self._write(data);
            return { writeTime: new Date() };
          },
          async delete() {
            const data = self._read();
            if (data[colName] && data[colName][docId]) {
              delete data[colName][docId];
              self._write(data);
            }
            return { writeTime: new Date() };
          }
        };
      },

      async get() {
        const data = self._read();
        const col = data[colName] || {};
        const docs = Object.keys(col).map(id => ({
          id,
          data: () => JSON.parse(JSON.stringify(col[id]))
        }));
        return {
          docs,
          forEach(cb) {
            docs.forEach(cb);
          }
        };
      },

      where(field, op, val) {
        return {
          async get() {
            const allDocs = await self.collection(colName).get();
            const filteredDocs = allDocs.docs.filter(doc => {
              const d = doc.data();
              if (!d) return false;
              if (op === '==') return d[field] === val;
              if (op === '!=') return d[field] !== val;
              if (op === 'array-contains') return Array.isArray(d[field]) && d[field].includes(val);
              return false;
            });
            return {
              docs: filteredDocs,
              forEach(cb) {
                filteredDocs.forEach(cb);
              }
            };
          }
        };
      }
    };
  }
}

// Check environment to decide if we initialize standard Firebase or Mock
if (process.env.USE_MOCK_DATABASE === 'true' || (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.log('ℹ️ Firebase credentials or emulator host not fully configured in environment.');
  console.log('🔄 Automatically falling back to local JSON database for storage...');
  const localDbPath = path.join(__dirname, '../../data/local_firestore.json');
  db = new MockFirestore(localDbPath);
  isMock = true;
} else {
  // Setup standard firebase admin
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: projectId
      });
    }
    db = admin.firestore();
    console.log(`Initialized Firebase Admin SDK targeting Project: ${projectId}`);
  } catch (error) {
    console.warn('⚠️ Failed to initialize standard Firebase Admin. Falling back to local JSON database...', error.message);
    const localDbPath = path.join(__dirname, '../../data/local_firestore.json');
    db = new MockFirestore(localDbPath);
    isMock = true;
  }
}

export { admin, db, isMock };
