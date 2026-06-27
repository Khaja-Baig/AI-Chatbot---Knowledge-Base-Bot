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
// Simple Local JSON Database Mock for Firestore supporting subcollections
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

  _getNested(pathArray) {
    const data = this._read();
    let current = data;
    for (const key of pathArray) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  }

  _setNested(pathArray, value) {
    const data = this._read();
    let current = data;
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    const lastKey = pathArray[pathArray.length - 1];
    current[lastKey] = value;
    this._write(data);
  }

  _deleteNested(pathArray) {
    const data = this._read();
    let current = data;
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      if (!current[key]) return;
      current = current[key];
    }
    const lastKey = pathArray[pathArray.length - 1];
    if (current && current[lastKey] !== undefined) {
      delete current[lastKey];
      this._write(data);
    }
  }

  collection(colName) {
    return this._collectionRoute([colName]);
  }

  _collectionRoute(pathArray) {
    const self = this;
    return {
      doc(docId) {
        const docPath = [...pathArray, docId];
        return {
          collection(subColName) {
            return self._collectionRoute([...docPath, subColName]);
          },
          async get() {
            const docData = self._getNested(docPath);
            return {
              exists: docData !== undefined && docData !== null,
              id: docId,
              data: () => docData ? JSON.parse(JSON.stringify(docData)) : undefined
            };
          },
          async set(newData, options = {}) {
            let docData = self._getNested(docPath) || {};
            if (options.merge) {
              docData = { ...docData, ...newData };
            } else {
              docData = newData;
            }
            self._setNested(docPath, docData);
            return { writeTime: new Date() };
          },
          async update(updateData) {
            let docData = self._getNested(docPath);
            if (docData === undefined || docData === null) {
              throw new Error(`Document "${docId}" does not exist.`);
            }
            docData = { ...docData, ...updateData };
            self._setNested(docPath, docData);
            return { writeTime: new Date() };
          },
          async delete() {
            self._deleteNested(docPath);
            return { writeTime: new Date() };
          }
        };
      },

      async get() {
        const colData = self._getNested(pathArray) || {};
        if (typeof colData !== 'object' || colData === null) {
          return {
            docs: [],
            forEach() {}
          };
        }
        const docs = Object.keys(colData).map(id => ({
          id,
          data: () => JSON.parse(JSON.stringify(colData[id]))
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
            const allDocs = await self._collectionRoute(pathArray).get();
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

// Initialize standard Firebase Admin App first so it's always available (e.g. for Auth)
try {
  if (admin.apps.length === 0) {
    // Resolve credential path absolutely from config file location so it works
    // regardless of which directory the command is run from
    const credEnvPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let credential;
    if (credEnvPath) {
      const resolvedCredPath = path.resolve(__dirname, '../../', credEnvPath.replace(/^\.\//,''));
      if (fs.existsSync(resolvedCredPath)) {
        credential = admin.credential.cert(resolvedCredPath);
      } else {
        console.warn(`⚠️ Service account key not found at: ${resolvedCredPath}`);
      }
    }
    admin.initializeApp({
      projectId: projectId,
      ...(credential ? { credential } : {})
    });
    console.log(`Initialized Firebase Admin App for project: ${projectId}`);
  }
} catch (error) {
  console.warn('⚠️ Failed to initialize Firebase Admin App:', error.message);
}

// Check environment to decide if we initialize standard Firestore or Mock
if (process.env.USE_MOCK_DATABASE === 'true' || (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.log('ℹ️ Firebase credentials or emulator host not fully configured in environment.');
  console.log('🔄 Automatically falling back to local JSON database for storage...');
  const localDbPath = path.join(__dirname, '../../data/local_firestore.json');
  db = new MockFirestore(localDbPath);
  isMock = true;
} else {
  // Setup standard firebase admin firestore
  try {
    db = admin.firestore();
    console.log(`Initialized Firebase Admin Firestore targeting Project: ${projectId}`);
  } catch (error) {
    console.warn('⚠️ Failed to initialize standard Firebase Firestore. Falling back to local JSON database...', error.message);
    const localDbPath = path.join(__dirname, '../../data/local_firestore.json');
    db = new MockFirestore(localDbPath);
    isMock = true;
  }
}

export { admin, db, isMock };
