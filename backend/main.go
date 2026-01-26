package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"
)

var characters = map[string]string{
	"thomas":         "Thomas (from Thomas the Tank Engine), a friendly blue steam train with a face",
	"catboy":         "Catboy (from PJ Masks), a boy superhero in a blue cat costume with cat ears",
	"owlette":        "Owlette (from PJ Masks), a girl superhero in a red owl costume with wings",
	"gekko":          "Gekko (from PJ Masks), a boy superhero in a green lizard costume",
	"spidey":         "Spidey (from Spidey and His Amazing Friends), a young kid Spider-Man in red and blue suit",
	"spin":           "Spin (from Spidey and His Amazing Friends), a young spider hero in black and red suit",
	"ghost-spider":   "Ghost-Spider (from Spidey and His Amazing Friends), a young girl spider hero in white and pink suit with hood",
	"trace-e":        "Trace-E (from Spidey and His Amazing Friends), a small friendly robot spider with a round body",
	"goby":           "Gobby (from Spidey and His Amazing Friends), a young mischievious green goblin",
	"curious-george": "Curious George (from Curious George), a friendly little brown monkey",
	"pete-the-cat":   "Pete the Cat (from Pete the Cat), a cool blue cat who loves music and wears sneakers",
	"brother-bear":   "Brother Bear (from Berenstain Bears), a young bear cub in red shirt and blue pants",
	"bluey":          "Bluey (from Bluey), a blue heeler puppy who loves to play",
	"snoopy":         "Snoopy (from Peanuts), a white beagle dog with black ears",
	"charlie-brown":  "Charlie Brown (from Peanuts), a boy with a round head and yellow zigzag shirt",
	"elmo":           "Elmo (from Sesame Street), a furry red monster with an orange nose who speaks in third person",
	"iron-man":       "Iron Man (from Marvel), a superhero in red and gold metal armor suit",
	"santa":          "Santa Claus, a jolly man with a white beard in a red suit who delivers presents",
	"wallace":        "Wallace (from Wallace and Gromit), a British man inventor with a big nose",
	"gromit":         "Gromit (from Wallace and Gromit), a clever brown/tan dog",
}

var settings = map[string]string{
	"castle":        "a magical castle with tall towers and colorful flags",
	"space":         "outer space with colorful planets and twinkling stars",
	"underwater":    "an underwater ocean scene with coral reefs and colorful fish",
	"north-pole":    "Santa's workshop at the North Pole with snow, elves, and presents",
	"playground":    "a colorful playground with slides and swings on a sunny day",
	"rainbow-land":  "a magical rainbow land with cotton candy clouds",
	"highway":       "driving vehicles down a busy highway with cars and trucks",
	"dance-party":   "a fun dance party with colorful lights and music",
	"bedroom":       "a cozy kids bedroom with toys and stuffed animals",
	"dinosaur-age":  "prehistoric times with dinosaurs and volcanoes",
	"airplanes":     "flying airplanes high up in the sky among the clouds",
	"ancient-egypt": "ancient Egypt with pyramids and sphinx",
	"zoo":           "a fun day at the zoo with animal enclosures and happy visitors",
	"brooklyn":      "the streets of Brooklyn with brownstone buildings and city life",
	"eiffel-tower":  "Paris with the Eiffel Tower in the background",
	"rollercoaster": "a thrilling rollercoaster park with exciting rides and attractions",
}

var styles = map[string]string{
	"default":    "Bright, cheerful cartoon illustration for children. Safe and appropriate for kids. Do not include any text or words in the image.",
	"coloring":   "Black and white line art coloring page with clear outlines, no colors filled in, suitable for children to color. Do not include any text or words in the image.",
	"claymation": "Claymation style like Wallace and Gromit, 3D clay figures with visible texture, stop-motion animation look. Do not include any text or words in the image.",
	"legos":      "Made entirely of LEGO bricks, blocky LEGO minifigure style characters, bright plastic colors. Do not include any text or words in the image.",
	"pixel-art":  "8-bit pixel art style, very blocky and pixelated like classic NES video games, limited color palette, large visible pixels. Do not include any text or words in the image.",
}

type GenerateRequest struct {
	Characters []string `json:"characters"`
	Setting    string   `json:"setting"`
	Style      string   `json:"style"`
}

type GenerateResponse struct {
	Scenario string `json:"scenario"`
	Image    string `json:"image"`
	Error    string `json:"error,omitempty"`
}

func main() {
	// Load .env file from current directory or parent directory
	if err := godotenv.Load(); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("No .env file found, using environment variables")
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Serve static files from the frontend build
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		// Check if ./out exists (production), otherwise use ../out (development)
		if _, err := os.Stat("./out"); err == nil {
			staticDir = "./out"
		} else {
			staticDir = "../out"
		}
	}

	// API routes
	http.HandleFunc("/api/generate", corsMiddleware(handleGenerate))
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Serve static files for everything else
	fs := http.FileServer(http.Dir(staticDir))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the file directly
		path := staticDir + r.URL.Path
		if r.URL.Path == "/" {
			path = staticDir + "/index.html"
		}

		// Check if file exists
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// For SPA routing, serve index.html for non-existent paths
			http.ServeFile(w, r, staticDir+"/index.html")
			return
		}

		fs.ServeHTTP(w, r)
	})

	log.Printf("Server starting on port %s", port)
	log.Printf("Serving static files from %s", staticDir)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func handleGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Characters) == 0 || req.Setting == "" {
		sendError(w, "Please select characters and a setting", http.StatusBadRequest)
		return
	}

	apiKey := os.Getenv("GOOGLE_AI_API_KEY")
	if apiKey == "" {
		sendError(w, "API key not configured", http.StatusInternalServerError)
		return
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		log.Printf("Failed to create client: %v", err)
		sendError(w, "Failed to initialize AI client", http.StatusInternalServerError)
		return
	}
	defer client.Close()

	// Build character descriptions
	log.Printf("DEBUG: Received characters: %v", req.Characters)
	log.Printf("DEBUG: Received setting: %s", req.Setting)
	var charDescs []string
	for _, id := range req.Characters {
		if desc, ok := characters[id]; ok {
			log.Printf("DEBUG: Found character %s -> %s", id, desc)
			charDescs = append(charDescs, desc)
		} else {
			log.Printf("DEBUG: Character %s NOT FOUND in map", id)
		}
	}
	characterDescriptions := strings.Join(charDescs, ", ")
	log.Printf("DEBUG: Final character descriptions: %s", characterDescriptions)

	settingDescription := settings[req.Setting]
	if settingDescription == "" {
		settingDescription = req.Setting
		log.Printf("DEBUG: Setting %s NOT FOUND, using raw value", req.Setting)
	} else {
		log.Printf("DEBUG: Found setting %s -> %s", req.Setting, settingDescription)
	}

	// Step 1: Generate scenario using text model
	textModel := client.GenerativeModel("gemini-2.0-flash")
	scenarioPrompt := fmt.Sprintf(`You are creating a fun scene for a children's picture.

Characters: %s
Setting: %s

In 1-2 short sentences, describe a fun, wholesome activity these characters could be doing together in this setting. Keep it simple, cheerful, and appropriate for young children. Focus on friendship and fun.

IMPORTANT: When mentioning each character, always include which show they are from in parentheses, e.g. "Snoopy (from Peanuts)" or "Thomas (from Thomas the Tank Engine)". This helps the image generator know exactly which character to draw.

Respond with ONLY the scene description, nothing else.`, characterDescriptions, settingDescription)

	scenarioResp, err := textModel.GenerateContent(ctx, genai.Text(scenarioPrompt))
	if err != nil {
		log.Printf("Failed to generate scenario: %v", err)
		sendError(w, "Failed to generate scenario", http.StatusInternalServerError)
		return
	}

	scenario := extractText(scenarioResp)
	if scenario == "" {
		sendError(w, "Failed to generate scenario text", http.StatusInternalServerError)
		return
	}

	// Step 2: Generate image using raw HTTP API (SDK doesn't support responseModalities yet)
	styleDescription := styles[req.Style]
	if styleDescription == "" {
		styleDescription = styles["default"]
	}

	imagePrompt := fmt.Sprintf(`Create a colorful children's book illustration:

%s

Style: %s`, scenario, styleDescription)

	imageBase64, err := generateImageRaw(apiKey, imagePrompt)
	if err != nil {
		log.Printf("Failed to generate image: %v", err)
		sendError(w, fmt.Sprintf("Failed to generate image: %v", err), http.StatusInternalServerError)
		return
	}

	resp := GenerateResponse{
		Scenario: scenario,
		Image:    "data:image/png;base64," + imageBase64,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// generateImageRaw uses the REST API directly for image generation
func generateImageRaw(apiKey, prompt string) (string, error) {
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
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text       string `json:"text,omitempty"`
					InlineData *struct {
						MimeType string `json:"mimeType"`
						Data     string `json:"data"`
					} `json:"inlineData,omitempty"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	for _, candidate := range result.Candidates {
		for _, part := range candidate.Content.Parts {
			if part.InlineData != nil && strings.HasPrefix(part.InlineData.MimeType, "image/") {
				return part.InlineData.Data, nil
			}
		}
	}

	return "", fmt.Errorf("no image in response")
}

func sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(GenerateResponse{Error: message})
}

func extractText(resp *genai.GenerateContentResponse) string {
	if resp == nil || len(resp.Candidates) == 0 {
		return ""
	}
	candidate := resp.Candidates[0]
	if candidate.Content == nil || len(candidate.Content.Parts) == 0 {
		return ""
	}
	for _, part := range candidate.Content.Parts {
		if text, ok := part.(genai.Text); ok {
			return string(text)
		}
	}
	return ""
}

// Keep this for reference if SDK is updated
func extractImage(resp *genai.GenerateContentResponse) string {
	if resp == nil || len(resp.Candidates) == 0 {
		return ""
	}
	candidate := resp.Candidates[0]
	if candidate.Content == nil || len(candidate.Content.Parts) == 0 {
		return ""
	}
	for _, part := range candidate.Content.Parts {
		if blob, ok := part.(genai.Blob); ok {
			if strings.HasPrefix(blob.MIMEType, "image/") {
				return base64.StdEncoding.EncodeToString(blob.Data)
			}
		}
	}
	return ""
}
