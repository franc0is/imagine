"use client";

import { useState } from "react";
import Image from "next/image";

// Character data with image paths
const CHARACTERS = [
  { id: "thomas", name: "Thomas", image: "/characters/thomas.png" },
  { id: "catboy", name: "Catboy", image: "/characters/catboy.png" },
  { id: "owlette", name: "Owlette", image: "/characters/owlette.png" },
  { id: "gekko", name: "Gekko", image: "/characters/gekko.png" },
  { id: "spidey", name: "Spidey", image: "/characters/spidey.png" },
  { id: "spin", name: "Spin", image: "/characters/spin.png" },
  { id: "ghost-spider", name: "Ghost-Spider", image: "/characters/ghost-spider.png" },
  { id: "trace-e", name: "Trace-E", image: "/characters/trace-e.png" },
  { id: "goby", name: "Gobby", image: "/characters/goby.png" },
  { id: "curious-george", name: "George", image: "/characters/curious-george.png" },
  { id: "pete-the-cat", name: "Pete", image: "/characters/pete-the-cat.png" },
  { id: "brother-bear", name: "Brother", image: "/characters/brother-bear.png" },
  { id: "bluey", name: "Bluey", image: "/characters/bluey.png" },
  { id: "snoopy", name: "Snoopy", image: "/characters/snoopy.png" },
  { id: "charlie-brown", name: "Charlie", image: "/characters/charlie-brown.png" },
  { id: "elmo", name: "Elmo", image: "/characters/elmo.png" },
  { id: "iron-man", name: "Iron Man", image: "/characters/iron-man.png" },
  { id: "santa", name: "Santa", image: "/characters/santa.png" },
  { id: "wallace", name: "Wallace", image: "/characters/wallace.png" },
  { id: "gromit", name: "Gromit", image: "/characters/gromit.png" },
];

// Settings still use emoji placeholders until we generate images
const SETTINGS = [
  { id: "castle", name: "Castle", emoji: "🏰" },
  { id: "space", name: "Space", emoji: "🚀" },
  { id: "underwater", name: "Underwater", emoji: "🌊" },
  { id: "north-pole", name: "North Pole", emoji: "🎅" },
  { id: "playground", name: "Playground", emoji: "🎠" },
  { id: "rainbow-land", name: "Rainbow Land", emoji: "🌈" },
  { id: "highway", name: "Highway", emoji: "🚗" },
  { id: "dance-party", name: "Dance Party", emoji: "💃" },
  { id: "bedroom", name: "Bedroom", emoji: "🛏️" },
  { id: "dinosaur-age", name: "Dinosaur Age", emoji: "🦖" },
  { id: "airplanes", name: "Airplanes", emoji: "✈️" },
  { id: "ancient-egypt", name: "Ancient Egypt", emoji: "🏺" },
  { id: "zoo", name: "The Zoo", emoji: "🦁" },
  { id: "brooklyn", name: "Brooklyn", emoji: "🗽" },
  { id: "eiffel-tower", name: "Eiffel Tower", emoji: "🇫🇷" },
  { id: "rollercoaster", name: "Rollercoaster", emoji: "🎢" },
];

type GenerationStatus = "idle" | "thinking" | "painting" | "done" | "error";

interface GeneratedImage {
  image: string;
  scenario: string;
}

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [charactersExpanded, setCharactersExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recent images carousel (max 10)
  const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);

  const toggleCharacter = (id: string) => {
    setSelectedCharacters((prev) => {
      if (prev.includes(id)) {
        return prev.filter((c) => c !== id);
      }
      if (prev.length >= 4) {
        return prev; // Max 4 characters
      }
      return [...prev, id];
    });
  };

  const selectSetting = (id: string) => {
    setSelectedSetting((prev) => (prev === id ? null : id));
  };

  const canGenerate =
    selectedCharacters.length > 0 &&
    selectedSetting !== null &&
    status !== "thinking" &&
    status !== "painting";

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setStatus("thinking");
    setError(null);
    setGeneratedImage(null);
    setScenario(null);

    let isActive = true;

    // Short delay then switch to painting status (only if still active)
    const timer = setTimeout(() => {
      if (isActive) setStatus("painting");
    }, 1500);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characters: selectedCharacters,
          setting: selectedSetting,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedImage(data.image);
      setScenario(data.scenario);
      setStatus("done");

      // Add to recent images (keep max 10, newest first)
      setRecentImages((prev) => {
        const newImages = [{ image: data.image, scenario: data.scenario }, ...prev];
        return newImages.slice(0, 10);
      });
    } catch (err: any) {
      isActive = false;
      clearTimeout(timer);
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setGeneratedImage(null);
    setScenario(null);
    setError(null);
  };

  const handleSelectRecent = (item: GeneratedImage) => {
    setGeneratedImage(item.image);
    setScenario(item.scenario);
    setStatus("done");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row p-4 gap-4 no-select">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div
          className="w-full max-w-2xl aspect-square rounded-3xl border-4 overflow-hidden flex flex-col items-center justify-center relative"
          style={{
            borderColor:
              status === "done" ? "rgba(78,205,196,0.5)" : "rgba(160,108,213,0.3)",
            borderStyle: status === "done" ? "solid" : "dashed",
            background:
              status === "done"
                ? "#fff"
                : "linear-gradient(135deg, rgba(160,108,213,0.1) 0%, rgba(78,205,196,0.1) 100%)",
          }}
        >
          {status === "idle" && (
            <span className="text-6xl opacity-30">🎨</span>
          )}

          {status === "thinking" && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl animate-bounce">🤔</div>
              <p className="text-xl text-kid-purple font-bold">
                Thinking of a story...
              </p>
            </div>
          )}

          {status === "painting" && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl animate-pulse">🎨</div>
              <p className="text-xl text-kid-purple font-bold">
                Painting your picture...
              </p>
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-kid-coral rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-3 h-3 bg-kid-yellow rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-3 h-3 bg-kid-teal rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {status === "done" && generatedImage && (
            <>
              <img
                src={generatedImage}
                alt="Generated scene"
                className="w-full h-full object-contain"
              />
              <button
                onClick={handleReset}
                className="absolute top-4 right-4 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all hover:scale-110"
                title="Make another"
              >
                <span className="text-2xl">🔄</span>
              </button>
            </>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="text-6xl">😅</div>
              <p className="text-xl text-kid-coral font-bold">Oops!</p>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={handleReset}
                className="mt-4 px-6 py-3 bg-kid-coral text-white rounded-full font-bold hover:scale-105 transition-transform"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Debug: Generated Prompt */}
        <div className="w-full max-w-2xl bg-gray-100 rounded-xl p-3 text-sm text-gray-600 h-20 overflow-y-auto">
          <p className="font-bold text-gray-500 text-xs mb-1">Generated Prompt:</p>
          <p>{scenario || <span className="text-gray-400 italic">No prompt yet...</span>}</p>
        </div>

        {/* Recent Images Carousel */}
        <div className="w-full max-w-2xl">
          <p className="text-sm text-gray-500 mb-2 font-bold">Recent Pictures:</p>
          <div className="flex gap-2 overflow-x-auto pb-2 min-h-[5.5rem]">
            {recentImages.length > 0 ? (
              recentImages.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectRecent(item)}
                  className={`
                    flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-3
                    transition-all hover:scale-105
                    ${generatedImage === item.image
                      ? "border-kid-teal ring-2 ring-kid-teal ring-offset-1"
                      : "border-gray-200 hover:border-kid-purple/50"
                    }
                  `}
                >
                  <img
                    src={item.image}
                    alt={`Recent image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))
            ) : (
              <p className="text-gray-400 italic text-sm">No pictures yet...</p>
            )}
          </div>
        </div>
      </div>

      {/* Selection Panel */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        {/* Characters Section */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <button
            onClick={() => setCharactersExpanded(!charactersExpanded)}
            className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-kid-coral to-kid-pink text-white font-bold text-xl"
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              Characters
              {selectedCharacters.length > 0 && (
                <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">
                  {selectedCharacters.length}/4
                </span>
              )}
            </span>
            <span
              className="text-2xl transition-transform"
              style={{
                transform: charactersExpanded ? "rotate(180deg)" : "rotate(0)",
              }}
            >
              ▼
            </span>
          </button>

          {charactersExpanded && (
            <div className="p-4 grid grid-cols-4 gap-3">
              {CHARACTERS.map((char) => {
                const isSelected = selectedCharacters.includes(char.id);
                const isDisabled =
                  !isSelected && selectedCharacters.length >= 4;

                return (
                  <button
                    key={char.id}
                    onClick={() => toggleCharacter(char.id)}
                    disabled={isDisabled}
                    className={`
                      w-16 h-16 rounded-full overflow-hidden
                      transition-all duration-200 border-4
                      ${
                        isSelected
                          ? "border-kid-coral scale-110 shadow-lg ring-2 ring-kid-coral ring-offset-2"
                          : isDisabled
                          ? "border-gray-200 opacity-50 cursor-not-allowed grayscale"
                          : "border-kid-purple/20 hover:border-kid-purple/50 hover:scale-105"
                      }
                    `}
                    title={char.name}
                  >
                    <Image
                      src={char.image}
                      alt={char.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-kid-teal to-kid-blue text-white font-bold text-xl"
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl">🗺️</span>
              Settings
              {selectedSetting && (
                <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">
                  1/1
                </span>
              )}
            </span>
            <span
              className="text-2xl transition-transform"
              style={{
                transform: settingsExpanded ? "rotate(180deg)" : "rotate(0)",
              }}
            >
              ▼
            </span>
          </button>

          {settingsExpanded && (
            <div className="p-4 grid grid-cols-4 gap-3">
              {SETTINGS.map((setting) => {
                const isSelected = selectedSetting === setting.id;

                return (
                  <button
                    key={setting.id}
                    onClick={() => selectSetting(setting.id)}
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center text-3xl
                      transition-all duration-200 border-4
                      ${
                        isSelected
                          ? "border-kid-teal bg-kid-teal/20 scale-110 shadow-lg ring-2 ring-kid-teal ring-offset-2"
                          : "border-kid-blue/20 bg-white hover:border-kid-blue/50 hover:scale-105"
                      }
                    `}
                    title={setting.name}
                  >
                    {setting.emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Go Button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`
            w-full py-6 rounded-3xl font-bold text-2xl
            flex items-center justify-center gap-3
            transition-all duration-300 shadow-lg
            ${
              canGenerate
                ? "bg-gradient-to-r from-kid-yellow to-kid-coral text-white hover:scale-105 hover:shadow-xl active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {status === "thinking" || status === "painting" ? (
            <>
              <span className="text-4xl animate-spin">⏳</span>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span className="text-4xl">🚀</span>
              <span>GO!</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
}
