//go:build ignore

// Script to generate style preview images using the Gemini API.
// Run from the project root: go run scripts/generate_styles.go

package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

type StylePrompt struct {
	filename string
	prompt   string
}

func main() {
	if err := godotenv.Load(); err != nil {
		if err := godotenv.Load(".env"); err != nil {
			fmt.Println("No .env file found")
		}
	}

	apiKey := os.Getenv("GOOGLE_AI_API_KEY")
	if apiKey == "" {
		fmt.Println("GOOGLE_AI_API_KEY not set")
		os.Exit(1)
	}

	styles := []StylePrompt{
		{
			filename: "public/styles/default.png",
			prompt:   "A friendly cartoon dog playing in a park. Bright, cheerful cartoon illustration for children, colorful and whimsical.",
		},
		{
			filename: "public/styles/coloring.png",
			prompt:   "A friendly cartoon dog playing in a park. Black and white line art coloring page with clear outlines, no colors filled in.",
		},
		{
			filename: "public/styles/claymation.png",
			prompt:   "A friendly cartoon dog playing in a park. Claymation style like Wallace and Gromit, 3D clay figures with visible texture.",
		},
		{
			filename: "public/styles/legos.png",
			prompt:   "A friendly cartoon dog playing in a park. Made entirely of LEGO bricks, blocky style, bright plastic colors.",
		},
		{
			filename: "public/styles/pixel-art.png",
			prompt:   "A friendly cartoon dog playing in a park. Retro pixel art style, 16-bit video game graphics.",
		},
		{
			filename: "public/styles/peanuts.png",
			prompt:   "A friendly cartoon dog playing in a park. In the art style of Peanuts comic strip by Charles Schulz, simple line drawings.",
		},
	}

	for _, style := range styles {
		fmt.Printf("Generating %s...\n", style.filename)
		err := generateImage(apiKey, style.prompt, style.filename)
		if err != nil {
			fmt.Printf("  ERROR: %v\n", err)
		} else {
			fmt.Printf("  Done!\n")
		}
	}
}

func generateImage(apiKey, prompt, filename string) error {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=%s", apiKey)

	requestBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"responseModalities": []string{"IMAGE", "TEXT"},
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					InlineData *struct {
						MimeType string `json:"mimeType"`
						Data     string `json:"data"`
					} `json:"inlineData,omitempty"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	for _, candidate := range result.Candidates {
		for _, part := range candidate.Content.Parts {
			if part.InlineData != nil {
				imageData, err := base64.StdEncoding.DecodeString(part.InlineData.Data)
				if err != nil {
					return fmt.Errorf("failed to decode image: %w", err)
				}
				return os.WriteFile(filename, imageData, 0644)
			}
		}
	}

	return fmt.Errorf("no image in response")
}
