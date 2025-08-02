import { LMStudioClient } from "@lmstudio/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    imagePath: null,
    prompt: "Describe this image in detail. What do you see?",
    model: "google/gemma-3-12b",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--image":
      case "-i":
        options.imagePath = args[++i];
        break;
      case "--prompt":
      case "-p":
        options.prompt = args[++i];
        break;
      case "--model":
      case "-m":
        options.model = args[++i];
        break;
      case "--help":
      case "-h":
        showHelp();
        process.exit(0);
      default:
        if (!options.imagePath) {
          options.imagePath = args[i];
        }
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Usage: node script.js [options] [image-path]

Options:
  -i, --image <path>     Path to the image file
  -p, --prompt <text>    Custom prompt for the LLM (default: "Describe this image in detail. What do you see?")
  -m, --model <name>     LLM model to use (default: "google/gemma-3-12b")
  -h, --help            Show this help message

Examples:
  node script.js images/image.png
  node script.js -i images/image.png -p "What text is written on this card?"
  node script.js --image images/image.png --prompt "Solve the math problem in this image"
`);
}

function formatOutput(prediction) {
  console.log("\n" + "=".repeat(80));
  console.log("🤖 LLM RESPONSE");
  console.log("=".repeat(80));

  // Extract the main content
  const content =
    prediction.content ||
    prediction.nonReasoningContent ||
    "No content available";

  // Clean up the content and format it nicely
  const formattedContent = content
    .replace(/^\s*Here's a description of the image you sent:\s*\n*/i, "")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();

  console.log(formattedContent);

  console.log("\n" + "-".repeat(80));
  console.log("📊 MODEL INFO");
  console.log("-".repeat(80));
  console.log(
    `Model: ${
      prediction.modelInfo?.displayName ||
      prediction.modelInfo?.modelKey ||
      "Unknown"
    }`
  );
  console.log(
    `Tokens: ${prediction.stats?.predictedTokensCount || "Unknown"} (${
      prediction.stats?.tokensPerSecond?.toFixed(1) || "Unknown"
    } tokens/sec)`
  );
  console.log(
    `Response time: ${
      prediction.stats?.timeToFirstTokenSec?.toFixed(2) || "Unknown"
    }s`
  );
  console.log("=".repeat(80) + "\n");
}

async function main() {
  try {
    const options = parseArguments();

    // Validate image path
    if (!options.imagePath) {
      console.error("❌ Error: Image path is required");
      console.log("Use --help for usage information");
      process.exit(1);
    }

    // Use the image path as provided (absolute or relative)
    const imagePath = options.imagePath;

    if (!existsSync(imagePath)) {
      console.error(`❌ Error: Image file not found: ${imagePath}`);
      process.exit(1);
    }

    console.log("🚀 Initializing LM Studio client...");
    const client = new LMStudioClient();

    console.log(`📁 Loading image: ${imagePath}`);
    const image = await client.files.prepareImage(imagePath);

    console.log(`🤖 Loading model: ${options.model}`);
    const model = await client.llm.model(options.model);

    console.log(`💬 Sending prompt: "${options.prompt}"`);
    const prediction = await model.respond([
      { role: "user", content: options.prompt, images: [image] },
    ]);

    formatOutput(prediction);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
