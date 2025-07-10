// Client-side batch processor for update-movie-batch
// This script demonstrates how to process movies in batches using the update-movie-batch Edge Function
// Configuration
const CONFIG = {
  SUPABASE_URL: 'https://cjrpnzwrldlxajkvznca.supabase.co',
  FUNCTION_URL: 'https://cjrpnzwrldlxajkvznca.supabase.co/functions/v1/update-movie-batch',
  BATCH_SIZE: 10,
  MAX_BATCHES: 10,
  BATCH_DELAY_MS: 2000 // Delay between batches in milliseconds
};
// Get your Supabase token - this should be from an authenticated user or stored securely
// NEVER hardcode this in production code
const SUPABASE_TOKEN = 'your-supabase-token'; // Replace with actual token or auth mechanism
// Helper function to sleep between batches
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
// Process a single batch
async function processBatch(startIndex = 0, batchSize = CONFIG.BATCH_SIZE) {
  console.log(`Processing batch starting at index ${startIndex} with size ${batchSize}...`);
  try {
    const response = await fetch(CONFIG.FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_TOKEN}`
      },
      body: JSON.stringify({
        startIndex,
        batchSize,
        requestDelay: 500 // Milliseconds between API requests within the Edge Function
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function returned error ${response.status}: ${errorText}`);
    }
    const result = await response.json();
    console.log(`Batch completed: ${result.message}`);
    // Return batch info for next iteration
    return result.batchInfo;
  } catch (error) {
    console.error('Error processing batch:', error);
    return null;
  }
}
// Main function to process all batches
async function processAllBatches() {
  let currentBatchIndex = 0;
  let startIndex = 0;
  let batchSize = CONFIG.BATCH_SIZE;
  let hasMore = true;
  console.log('Starting batch processing...');
  while(hasMore && (CONFIG.MAX_BATCHES === null || currentBatchIndex < CONFIG.MAX_BATCHES)){
    // Process current batch
    const batchInfo = await processBatch(startIndex, batchSize);
    // Check if we should continue
    if (!batchInfo || !batchInfo.hasMore || !batchInfo.nextBatch) {
      console.log('No more batches to process or an error occurred.');
      hasMore = false;
    } else {
      // Prepare for next batch
      startIndex = batchInfo.nextBatch.startIndex;
      batchSize = batchInfo.nextBatch.size;
      currentBatchIndex++;
      console.log(`Completed batch ${currentBatchIndex}. Next batch will start at index ${startIndex}.`);
      // Add delay between batches to avoid overloading the system
      console.log(`Waiting ${CONFIG.BATCH_DELAY_MS}ms before next batch...`);
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }
  if (CONFIG.MAX_BATCHES !== null && currentBatchIndex >= CONFIG.MAX_BATCHES) {
    console.log(`Reached maximum batch limit (${CONFIG.MAX_BATCHES}). Stopping.`);
  }
  console.log('Batch processing complete!');
}
// Run the batch processor
processAllBatches().catch((error)=>{
  console.error('Fatal error in batch processor:', error);
});
