import { ChromaService } from '../src/services/chroma.service.js';

async function main() {
  console.log('🧹 Wiping admissions_knowledge collection in ChromaDB...');
  try {
    const deleted = await ChromaService.deleteCollection('admissions_knowledge');
    console.log(`- Deleted collection: ${deleted}`);
    
    await ChromaService.getOrCreateCollection('admissions_knowledge');
    console.log('✅ ChromaDB collection recreated as empty and clean!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to clean ChromaDB:', error);
    process.exit(1);
  }
}

main();
