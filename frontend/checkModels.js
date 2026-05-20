import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function listAvailableModels() {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error("❌ No Anthropic API key found in .env.local");
    return;
  }

  try {
    console.log("🔍 Checking Anthropic model access for your key...");

    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    const data = await response.json();

    if (data.error) {
        console.error("❌ API Error:", data.error.message || data.error);
        return;
    }

    console.log("\n✅ AVAILABLE MODELS:");
    console.log("-----------------------------------");
    (data.data || data.models || [])
      .filter(model => (model.id || model.name || '').includes('claude'))
      .forEach(model => {
        console.log(`Model Name: ${model.id || model.name}`);
      });
    console.log("-----------------------------------");
    console.log("👉 Use claude-opus-4-6 in your ChatBot backend configuration.");

  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listAvailableModels();