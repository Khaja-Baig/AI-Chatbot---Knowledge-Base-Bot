// Native Node 20+ E2E Upload and Edit Test

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log("🚀 Starting E2E Upload, Smart Diff & Job Polling Test...");
  const adminToken = "test-admin-token";
  
  try {
    // 1. Trigger multipart file upload
    console.log("\nStep 1: Uploading a new text file via multipart form...");
    const formData = new FormData();
    const fileContent = "Hello NavGurukul! This is a test file for admissions guidelines.\n\nNavGurukul is a free residential program.\nIt lasts for 1 year.";
    const blob = new Blob([fileContent], { type: "text/plain" });
    formData.append("file", blob, "admissions_temp_test.txt");

    const uploadRes = await fetch("http://localhost:5001/api/knowledge/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`
      },
      body: formData
    });

    if (uploadRes.status !== 202) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed with status ${uploadRes.status}: ${errText}`);
    }

    const uploadData = await uploadRes.json();
    console.log("✅ Upload returned status 202 successfully!");
    console.log("Job ID:", uploadData.jobId);

    // 2. Poll job status
    console.log("\nStep 2: Polling job progress...");
    let uploadJobId = uploadData.jobId;
    let uploadCompleted = false;

    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const jobRes = await fetch(`http://localhost:5001/api/knowledge/jobs/${uploadJobId}`, {
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      
      if (!jobRes.ok) {
        throw new Error(`Job status request failed with status ${jobRes.status}`);
      }

      const jobData = await jobRes.json();
      console.log(`   - Status: ${jobData.job.status}, Progress: ${jobData.job.progress.done}/${jobData.job.progress.total}`);

      if (jobData.job.status === 'completed') {
        uploadCompleted = true;
        break;
      } else if (jobData.job.status === 'failed') {
        throw new Error(`Job failed: ${jobData.job.error}`);
      }
    }

    if (!uploadCompleted) {
      throw new Error("Job timed out before completion.");
    }
    console.log("✅ Ingestion job completed successfully!");

    // 3. Test smart diffing by editing the document
    console.log("\nStep 3: Editing the document to test smart diffing...");
    const updatedContent = "Hello NavGurukul! This is a test file for admissions guidelines.\n\nNavGurukul is a free residential program.\nIt lasts for 1 year.\n\nAdding a brand new paragraph here to verify smart diff works correctly.";
    
    const editRes = await fetch("http://localhost:5001/api/knowledge/sources/admissions_temp_test.txt", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ content: updatedContent })
    });

    if (editRes.status !== 202) {
      const errText = await editRes.text();
      throw new Error(`Edit failed with status ${editRes.status}: ${errText}`);
    }

    const editData = await editRes.json();
    console.log("✅ Edit returned status 202 successfully!");
    console.log("Job ID:", editData.jobId);

    // 4. Poll edit job status
    console.log("\nStep 4: Polling edit job progress (smart diff)...");
    let editJobId = editData.jobId;
    let editCompleted = false;

    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const jobRes = await fetch(`http://localhost:5001/api/knowledge/jobs/${editJobId}`, {
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      
      if (!jobRes.ok) {
        throw new Error(`Edit job status request failed with status ${jobRes.status}`);
      }

      const jobData = await jobRes.json();
      console.log(`   - Status: ${jobData.job.status}, Progress: ${jobData.job.progress.done}/${jobData.job.progress.total}`);

      if (jobData.job.status === 'completed') {
        editCompleted = true;
        break;
      } else if (jobData.job.status === 'failed') {
        throw new Error(`Edit job failed: ${jobData.job.error}`);
      }
    }

    if (!editCompleted) {
      throw new Error("Edit job timed out before completion.");
    }
    console.log("✅ Smart diff edit job completed successfully!");

    // 5. Clean up by deleting the temporary file
    console.log("\nStep 5: Cleaning up (deleting source file)...");
    const deleteRes = await fetch("http://localhost:5001/api/knowledge/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ fileName: "admissions_temp_test.txt" })
    });

    if (deleteRes.ok) {
      console.log("✅ Test source file deleted successfully.");
    } else {
      console.warn("⚠️ Failed to delete test source file during cleanup.");
    }

    console.log("\n==============================================");
    console.log("🎉 E2E UPLOAD & SMART DIFF TEST PASSED! 🎉");
    console.log("==============================================\n");

  } catch (error) {
    console.error("\n❌ E2E Test failed:", error.message);
  }
}

runTest();
