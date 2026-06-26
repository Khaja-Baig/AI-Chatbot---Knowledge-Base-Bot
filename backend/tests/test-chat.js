// Using global fetch (native in Node 20+)

async function testChat() {
  console.log("Testing Chat Controller End-to-End...");
  const sessionId = `test_session_${Date.now()}`;
  try {
    // 1. Send first message
    console.log("Sending first message: 'Tell me about the School of Business.'");
    const res = await fetch("http://localhost:5001/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        message: "Tell me about the School of Business."
      })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Chat API responded with status ${res.status}: ${errText}`);
    }
    
    const data = await res.json();
    console.log("\n💬 Counselor Response:\n", data.response);
    
    // 2. Send follow up to test context-awareness
    console.log("\nSending follow-up message: 'What are the career paths?'");
    const resFollowUp = await fetch("http://localhost:5001/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        message: "What are the career paths?"
      })
    });
    
    if (!resFollowUp.ok) {
      const errText = await resFollowUp.text();
      throw new Error(`Chat API responded with status ${resFollowUp.status}: ${errText}`);
    }
    
    const dataFollowUp = await resFollowUp.json();
    console.log("\n💬 Counselor Follow-up Response:\n", dataFollowUp.response);
    
    // 3. Test multilingual/Hinglish
    console.log("\nSending Hinglish message: 'placement details batao'");
    const resHinglish = await fetch("http://localhost:5001/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        message: "placement details batao"
      })
    });
    
    if (!resHinglish.ok) {
      const errText = await resHinglish.text();
      throw new Error(`Chat API responded with status ${resHinglish.status}: ${errText}`);
    }
    
    const dataHinglish = await resHinglish.json();
    console.log("\n💬 Counselor Hinglish Response:\n", dataHinglish.response);
    
    console.log("\n====================================");
    console.log("🎉 E2E Chat Integration Test PASSED! 🎉");
    console.log("====================================\n");
  } catch (error) {
    console.error("❌ E2E Chat Test failed:", error.message);
  }
}

testChat();
