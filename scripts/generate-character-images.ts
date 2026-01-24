import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

const CHARACTERS = [
  {
    id: "thomas",
    name: "Thomas the Tank Engine",
    prompt: "Thomas the Tank Engine, friendly blue steam train with a smiling face, number 1 on the side",
  },
  {
    id: "catboy",
    name: "Catboy",
    prompt: "PJ Masks Catboy, young superhero boy in blue cat costume with cat ears and tail, friendly pose",
  },
  {
    id: "owlette",
    name: "Owlette",
    prompt: "PJ Masks Owlette, young superhero girl in red owl costume with wings, friendly pose",
  },
  {
    id: "gekko",
    name: "Gekko",
    prompt: "PJ Masks Gekko, young superhero boy in green lizard costume with scales, friendly pose",
  },
  {
    id: "spidey",
    name: "Spidey",
    prompt: "Spidey from Spidey and His Amazing Friends, young kid Spider-Man in red and blue suit, friendly and cute",
  },
  {
    id: "spin",
    name: "Spin",
    prompt: "Spin character from Spidey and His Amazing Friends. Young kid Spider-Man chacater in BLACK and RED suit.",
  },
  {
    id: "ghost-spider",
    name: "Ghost-Spider",
    prompt: "Ghost-Spider from Spidey and His Amazing Friends, young girl hero in white and pink spider suit with hood",
  },
  {
    id: "curious-george",
    name: "Curious George",
    prompt: "Curious George, cute friendly brown monkey with big curious eyes, classic cartoon style",
  },
  {
    id: "snoopy",
    name: "Snoopy",
    prompt: "Snoopy the beagle from Peanuts, white dog with black ears, happy expression, classic cartoon style",
  },
  {
    id: "charlie-brown",
    name: "Charlie Brown",
    prompt: "Charlie Brown from Peanuts, young boy with round head, yellow shirt with black zigzag stripe, friendly smile",
  },
  {
    id: "wallace",
    name: "Wallace",
    prompt: "Wallace from Wallace and Gromit, British man with big nose and smile, claymation style",
  },
  {
    id: "gromit",
    name: "Gromit",
    prompt: "Gromit from Wallace and Gromit, clever brown/tan dog, claymation style, expressive eyes",
  },
];

async function generateCharacterImages() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.error("Error: GOOGLE_AI_API_KEY environment variable is not set");
    console.log("\nTo set it, run:");
    console.log("  export GOOGLE_AI_API_KEY=your_api_key_here");
    console.log("\nGet your API key from: https://aistudio.google.com/apikey");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use Gemini 2.0 Flash image generation model
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: {
      responseModalities: ["image", "text"],
    } as any,
  });

  const outputDir = path.join(process.cwd(), "public", "characters");

  console.log("Generating character images...\n");

  for (const character of CHARACTERS) {
    const outputPath = path.join(outputDir, `${character.id}.png`);

    // Skip if image already exists
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${character.name} - already exists, skipping`);
      continue;
    }

    console.log(`Generating: ${character.name}...`);

    const prompt = `Create a circular profile icon of ${character.prompt}.
Style: Cute, colorful children's illustration, simple and friendly, suitable for a button icon.
The character should be centered and fill most of the circular frame.
Background: soft pastel color that complements the character.
Make it appealing for young children.`;

    try {
      const response = await model.generateContent(prompt);
      const result = response.response;

      // Debug: print response structure (uncomment to debug)
      // console.log("Full response:", JSON.stringify(result, null, 2).substring(0, 2000));

      // Find the image part in the response
      let imageFound = false;
      for (const part of result.candidates?.[0]?.content?.parts || []) {
        // Check for inlineData (Gemini 2.0 format)
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync(outputPath, buffer);
          console.log(`✓ ${character.name} - saved to ${outputPath}`);
          imageFound = true;
          break;
        }
        // Check for fileData (Gemini 3 format)
        if ((part as any).fileData?.mimeType?.startsWith("image/")) {
          const fileUri = (part as any).fileData.fileUri;
          console.log(`✓ ${character.name} - file URI: ${fileUri}`);
          // Download the file
          const imageResponse = await fetch(fileUri);
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          fs.writeFileSync(outputPath, buffer);
          console.log(`✓ ${character.name} - saved to ${outputPath}`);
          imageFound = true;
          break;
        }
      }

      if (!imageFound) {
        console.log(`✗ ${character.name} - no image in response`);
        console.log("Response parts:", JSON.stringify(result.candidates?.[0]?.content?.parts, null, 2));
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`✗ ${character.name} - error: ${error.message}`);
    }
  }

  console.log("\nDone!");
}

generateCharacterImages();
