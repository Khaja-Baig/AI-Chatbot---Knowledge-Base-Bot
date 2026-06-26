import { ChromaService } from '../src/services/chroma.service.js';

async function runTest() {
  console.log("Running ChromaDB connection test...");
  try {
    const colName = "test_collection";
    
    // Clean up from previous run if any
    await ChromaService.deleteCollection(colName);
    
    // Create collection
    const col = await ChromaService.getOrCreateCollection(colName);
    console.log("Collection successfully retrieved/created:", col.name);
    
    // Add document with dummy 768-dim embedding
    const dummyEmbedding = new Array(768).fill(0.01);
    const items = [
      {
        id: "doc1",
        text: "NavGurukul offers a 1-year Software Engineering program.",
        metadata: { category: "admissions", test: true },
        embedding: dummyEmbedding
      }
    ];
    
    await ChromaService.addDocuments(colName, items);
    console.log("Successfully inserted test document.");
    
    // Query it back
    const results = await ChromaService.query(colName, dummyEmbedding, 1);
    console.log("Query results:", JSON.stringify(results, null, 2));
    
    if (results.length > 0 && results[0].id === "doc1") {
      console.log("\n====================================");
      console.log("🎉 ChromaDB Integration Test PASSED! 🎉");
      console.log("====================================\n");
    } else {
      console.error("❌ Test FAILED: Query did not return doc1.");
    }
    
    // Clean up
    await ChromaService.deleteCollection(colName);
  } catch (error) {
    console.error("❌ Test failed with exception:", error);
  }
}

runTest();
