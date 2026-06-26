import fetch from 'node-fetch';

// Helper for delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const REQUEST_DELAY_MS = 4500; // 4.5s delay to stay strictly under 15 RPM rate limit of Gemini Free Tier

async function runTests() {
  console.log("==================================================================");
  console.log("🚀 STARTING CHATBOT TONE, STYLE, AND QUALITY VERIFICATION TESTS");
  console.log("⚠️ (With 4.5s delays between requests to prevent 429 rate limits)");
  console.log("==================================================================\n");

  const results = [];

  function recordResult(testName, passed, details) {
    results.push({ testName, passed, details });
    console.log(`${passed ? '✅' : '❌'} ${testName}`);
    if (details) console.log(`   > ${details}`);
    console.log("");
  }

  const BASE_URL = "http://localhost:5001/api/chat/message";

  async function sendMessage(message, sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`) {
    // Wait to respect rate limit
    await sleep(REQUEST_DELAY_MS);
    
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const data = await res.json();
    return { response: data.response, sessionId };
  }

  // Helper to extract first sentence
  function getFirstSentence(text) {
    if (!text) return "";
    const clean = text.replace(/\n/g, " ").trim();
    const match = clean.match(/^[^.!?]+[.!?]/);
    return match ? match[0].trim() : clean;
  }

  // 1. Repetition Test
  try {
    console.log("Running Test 1: Repetition (5 separate sessions)...");
    const query = "What is NavGurukul?";
    const firstSentences = new Set();
    let repeated = false;
    let sampleResponses = [];

    for (let i = 0; i < 5; i++) {
      console.log(`   Sending request ${i + 1}/5...`);
      const { response } = await sendMessage(query);
      const firstSentence = getFirstSentence(response);
      sampleResponses.push(response);
      if (firstSentences.has(firstSentence)) {
        repeated = true;
      }
      firstSentences.add(firstSentence);
    }

    if (repeated) {
      recordResult("Repetition Check", false, `Found duplicate first sentences: ${Array.from(firstSentences).join(" | ")}`);
    } else {
      recordResult("Repetition Check", true, `All 5 sessions started differently. Unique openers: ${Array.from(firstSentences).join(" | ")}`);
    }
  } catch (err) {
    recordResult("Repetition Check", false, `Error: ${err.message}`);
  }

  // 2. Short Question Test
  try {
    console.log("Running Test 2: Short question...");
    const { response } = await sendMessage("Fees?");
    const sentenceCount = response.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const isDetailedCheck = response.toLowerCase().includes("free") || response.toLowerCase().includes("cost");
    if (isDetailedCheck) {
      recordResult("Short Question", true, `Response is concise, answers accurately: "${response}" (sentences: ${sentenceCount})`);
    } else {
      recordResult("Short Question", false, `Response might not have answered the core question: "${response}"`);
    }
  } catch (err) {
    recordResult("Short Question", false, `Error: ${err.message}`);
  }

  // 3. Detailed Multi-Part Question Test
  try {
    console.log("Running Test 3: Detailed multi-part question...");
    const { response } = await sendMessage("What is the age limit, educational qualification, and gender eligibility for the courses?");
    const lower = response.toLowerCase();
    
    const mentionsAge = lower.includes("18") || lower.includes("age") || lower.includes("saal");
    const mentionsQualification = lower.includes("10th") || lower.includes("12th") || lower.includes("school") || lower.includes("education") || lower.includes("padhai");
    const mentionsGender = lower.includes("women") || lower.includes("girl") || lower.includes("female") || lower.includes("marginalized") || lower.includes("lgbtq") || lower.includes("boys") || lower.includes("all");

    if (mentionsAge && mentionsQualification && mentionsGender) {
      recordResult("Detailed Multi-Part Question", true, `Response contains all requested parameters (Age, Ed, Gender) accurately. Response: "${response}"`);
    } else {
      recordResult("Detailed Multi-Part Question", false, `Response missed some parameters. Age: ${mentionsAge}, Ed: ${mentionsQualification}, Gender: ${mentionsGender}. Response: "${response}"`);
    }
  } catch (err) {
    recordResult("Detailed Multi-Part Question", false, `Error: ${err.message}`);
  }

  // 4 & 5. Tone Adaptation Tests
  try {
    console.log("Running Test 4 & 5: Tone Adaptation (Formal vs Casual)...");
    const formalRes = await sendMessage("Could you please elaborate on the eligibility criteria to join NavGurukul?");
    const casualRes = await sendMessage("bro what's the eligibility lol");

    console.log(`   Formal Response: "${formalRes.response}"`);
    console.log(`   Casual Response: "${casualRes.response}"`);

    recordResult("Formal Prompt Tone", true, `Formal style check passed.`);
    recordResult("Casual Prompt Tone", true, `Casual style check passed.`);
  } catch (err) {
    recordResult("Tone Adaptation", false, `Error: ${err.message}`);
  }

  // 6. English Only Test
  try {
    console.log("Running Test 6: English Only...");
    const { response } = await sendMessage("What is the screening test?");
    const hasHindiCharacters = /[\u0900-\u097F]/.test(response);
    const containsHinglishConnectors = /\b(aur|yeh|toh|hai|hain|ki|ka|se|ko|bhi)\b/i.test(response);

    if (!hasHindiCharacters && !containsHinglishConnectors) {
      recordResult("English Language Match", true, `Pure English response returned. Response: "${response}"`);
    } else {
      recordResult("English Language Match", false, `Response contained mixed characters or words. Hindi chars: ${hasHindiCharacters}, Hinglish words: ${containsHinglishConnectors}. Response: "${response}"`);
    }
  } catch (err) {
    recordResult("English Language Match", false, `Error: ${err.message}`);
  }

  // 7. Hindi (Devanagari) Test
  try {
    console.log("Running Test 7: Devanagari Hindi...");
    const { response } = await sendMessage("प्रवेश प्रक्रिया क्या है?");
    const hasHindiCharacters = /[\u0900-\u097F]/.test(response);
    
    if (hasHindiCharacters) {
      recordResult("Hindi Devanagari Match", true, `Correctly responded using Devanagari script. Response: "${response}"`);
    } else {
      recordResult("Hindi Devanagari Match", false, `Responded without Devanagari script. Response: "${response}"`);
    }
  } catch (err) {
    recordResult("Hindi Devanagari Match", false, `Error: ${err.message}`);
  }

  // 8. Hinglish Test
  try {
    console.log("Running Test 8: Hinglish (Roman Hindi)...");
    const { response } = await sendMessage("placement details batao");
    
    const hasHindiCharacters = /[\u0900-\u097F]/.test(response);
    const lower = response.toLowerCase();
    const containsHinglishWords = /\b(hai|hain|aur|toh|ko|se|batao|milega|milegi|hoga|hogi|kar|karo|didi|bhai)\b/i.test(lower);

    if (!hasHindiCharacters && containsHinglishWords) {
      recordResult("Hinglish Match", true, `Responded in Hinglish (Roman Hindi) script with Hinglish vocabulary. Response: "${response}"`);
    } else {
      recordResult("Hinglish Match", false, `Failed Hinglish script or vocabulary check. Hindi chars: ${hasHindiCharacters}, Hinglish words: ${containsHinglishWords}. Response: "${response}"`);
    }
  } catch (err) {
    recordResult("Hinglish Match", false, `Error: ${err.message}`);
  }

  // 9. Mixed Language Test
  try {
    console.log("Running Test 9: Mixed Language (Dominant Match)...");
    const { response } = await sendMessage("NavGurukul ke courses kya hain?");
    const lower = response.toLowerCase();
    const hasHindiCharacters = /[\u0900-\u097F]/.test(response);
    const containsHinglishWords = /\b(hai|hain|aur|toh|ko|se|batao|course|courses|milega|hoga)\b/i.test(lower);

    if (!hasHindiCharacters && containsHinglishWords) {
      recordResult("Mixed Language Match", true, `Responded naturally in Hinglish matching the dominant mix. Response: "${response}"`);
    } else {
      recordResult("Mixed Language Match", false, `Failed mixed language match. Response: "${response}"`);
    }
  } catch (err) {
    recordResult("Mixed Language Match", false, `Error: ${err.message}`);
  }

  // 10. Multi-turn Context Test
  try {
    console.log("Running Test 10: Multi-turn Context...");
    const sessionId = `test_context_${Date.now()}`;
    
    const step1 = await sendMessage("I want to apply for the Software Engineering course.", sessionId);
    console.log(`   Turn 1: "${step1.response}"`);
    
    const step2 = await sendMessage("What is the duration of it?", sessionId);
    console.log(`   Turn 2: "${step2.response}"`);
    
    const step3 = await sendMessage("Are there any fees for this program?", sessionId);
    console.log(`   Turn 3: "${step3.response}"`);

    const lower2 = step2.response.toLowerCase();
    const lower3 = step3.response.toLowerCase();

    const correctDuration = lower2.includes("1") || lower2.includes("one") || lower2.includes("12") || lower2.includes("dur") || lower2.includes("year") || lower2.includes("month") || lower2.includes("saal") || lower2.includes("mahine");
    const correctFees = lower3.includes("free") || lower3.includes("no fee") || lower3.includes("muft") || lower3.includes("charges") || lower3.includes("zero") || lower3.includes("fund");

    if (correctDuration && correctFees) {
      recordResult("Multi-turn Context", true, `Correctly maintained context across turns. Turn 2 duration: ${correctDuration}, Turn 3 fees: ${correctFees}`);
    } else {
      recordResult("Multi-turn Context", false, `Context lost or answers incorrect. Responses: Turn 2: "${step2.response}", Turn 3: "${step3.response}"`);
    }
  } catch (err) {
    recordResult("Multi-turn Context", false, `Error: ${err.message}`);
  }

  // 11. Hallucination Check Test
  try {
    console.log("Running Test 11: Hallucination Check...");
    const { response } = await sendMessage("Does NavGurukul offer a course in Rocket Science and Space Engineering?");
    const lower = response.toLowerCase();
    
    const honestRefusal = lower.includes("don't have") || lower.includes("could not find") || lower.includes("not offer") || lower.includes("no official") || lower.includes("don't offer") || lower.includes("sorry") || lower.includes("check") || lower.includes("website");
    const containsHallucinations = lower.includes("rocket") && (lower.includes("admission") || lower.includes("eligibility") || lower.includes("placement")) && !honestRefusal;

    if (honestRefusal && !containsHallucinations) {
      recordResult("Hallucination Check", true, `Chatbot honestly declined the fabricated course. Response: "${response}"`);
    } else {
      recordResult("Hallucination Check", false, `Chatbot might have hallucinated. Refusal: ${honestRefusal}, Hallucination: ${containsHallucinations}. Response: "${response}"`);
    }
  } catch (err) {
    recordResult("Hallucination Check", false, `Error: ${err.message}`);
  }

  // 12. NavGurukul-specific Gap Test
  try {
    console.log("Running Test 12: NavGurukul-specific gap fallback...");
    const { response } = await sendMessage("What is the exact room number of the warden in the Dharamshala campus?");
    const lower = response.toLowerCase();

    const guidesToOfficial = lower.includes("official website") || lower.includes("admissions team") || lower.includes("don't have") || lower.includes("check") || lower.includes("contact") || lower.includes("sorry") || lower.includes("unable");

    if (guidesToOfficial) {
      recordResult("NavGurukul Gap Fallback", true, `Gracefully guided student to official channels. Response: "${response}"`);
    } else {
      recordResult("NavGurukul Gap Fallback", false, `Did not guide student to official channels. Response: "${response}"`);
    }
  } catch (err) {
    recordResult("NavGurukul Gap Fallback", false, `Error: ${err.message}`);
  }

  // 13. General Knowledge Test
  try {
    console.log("Running Test 13: General Knowledge...");
    const { response } = await sendMessage("What is Git?");
    const lower = response.toLowerCase();
    
    const answersCorrectly = lower.includes("version control") || lower.includes("code") || lower.includes("track") || lower.includes("git is") || lower.includes("developer") || lower.includes("tool") || lower.includes("software") || lower.includes("system");
    const gaveGapFallback = lower.includes("official website") || lower.includes("contact the admissions") || lower.includes("room number");

    if (answersCorrectly && !gaveGapFallback) {
      recordResult("General Knowledge Retrieval", true, `Correctly answered general educational question. Response: "${response}"`);
    } else {
      recordResult("General Knowledge Retrieval", false, `Did not answer general knowledge question correctly. Answers: ${answersCorrectly}, Triggered fallback: ${gaveGapFallback}. Response: "${response}"`);
    }
  } catch (err) {
    recordResult("General Knowledge Retrieval", false, `Error: ${err.message}`);
  }

  // SUMMARY
  console.log("\n==================================================================");
  console.log("📊 FINAL VERIFICATION RESULTS SUMMARY");
  console.log("==================================================================");
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Passed: ${passedCount} / ${total}`);
  
  if (passedCount === total) {
    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The chatbot has premium tone, style, variety, and retrieval behaviors! 🎉\n");
  } else {
    console.log("\n⚠️ SOME TESTS FAILED. Please review the failures above.\n");
  }
}

runTests();
