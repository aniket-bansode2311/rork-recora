import { useState } from "react";
import { Alert } from "react-native";

interface AIProcessingResult {
  summary?: string;
  keyPoints?: string[];
  formattedText?: string;
}

export function useAIProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processText = async (
    text: string, 
    type: 'summarize' | 'keyPoints' | 'format' | 'improve'
  ): Promise<string | null> => {
    setIsProcessing(true);

    try {
      const prompts = {
        summarize: `Please provide a concise summary of the following text. Focus on the main points and key information:\n\n${text}`,
        keyPoints: `Extract the key points from the following text and format them as a bullet list. Each point should be clear and actionable:\n\n${text}`,
        format: `Please format and improve the readability of the following text. Fix any grammar issues, improve structure, and make it more professional while preserving the original meaning:\n\n${text}`,
        improve: `Please improve the following text by making it more clear, professional, and well-structured. Fix grammar, improve flow, and enhance readability:\n\n${text}`
      };

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompts[type]
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`AI processing failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.completion;

    } catch (error) {
      console.error('AI processing error:', error);
      Alert.alert(
        "AI Processing Error",
        "Failed to process text with AI. Please try again."
      );
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const searchKeywords = (text: string, keywords: string[]): { keyword: string; matches: number; positions: number[] }[] => {
    const results = keywords.map(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex) || [];
      const positions: number[] = [];
      
      let match;
      const searchRegex = new RegExp(keyword, 'gi');
      while ((match = searchRegex.exec(text)) !== null) {
        positions.push(match.index);
      }

      return {
        keyword,
        matches: matches.length,
        positions
      };
    });

    return results.filter(result => result.matches > 0);
  };

  return {
    processText,
    searchKeywords,
    isProcessing
  };
}