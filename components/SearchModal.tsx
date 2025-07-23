import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, Modal, Pressable, TextInput, ScrollView } from "react-native";
import { X, Search, MapPin } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useAIProcessing } from "@/hooks/use-ai-processing";

interface SearchModalProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

export default function SearchModal({ visible, content, onClose }: SearchModalProps) {
  const { colors } = useTheme();
  const { searchKeywords } = useAIProcessing();
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const keywords = searchQuery.split(' ').filter(k => k.trim());
    return searchKeywords(content, keywords);
  }, [searchQuery, content]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const keywords = query.split(' ').filter(k => k.trim());
    let highlightedText = text;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, '**$1**');
    });
    
    return highlightedText;
  };

  const getContextAroundMatch = (text: string, position: number, contextLength: number = 50) => {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    const context = text.substring(start, end);
    
    return {
      context,
      isStart: start === 0,
      isEnd: end === text.length
    };
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.mediumGray }]}>
          <Text style={[styles.title, { color: colors.text }]}>Search in Note</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.lightGray }]}>
            <Search size={20} color={colors.darkGray} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for keywords..."
              placeholderTextColor={colors.darkGray}
              autoFocus
            />
          </View>
        </View>

        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {searchQuery.trim() && searchResults.length === 0 && (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.darkGray }]}>
                No matches found for "{searchQuery}"
              </Text>
            </View>
          )}

          {searchResults.map((result, index) => (
            <View key={index} style={[styles.resultCard, { backgroundColor: colors.lightGray }]}>
              <View style={styles.resultHeader}>
                <View style={styles.keywordContainer}>
                  <Text style={[styles.keyword, { color: colors.purple.primary }]}>
                    "{result.keyword}"
                  </Text>
                  <Text style={[styles.matchCount, { color: colors.darkGray }]}>
                    {result.matches} match{result.matches !== 1 ? 'es' : ''}
                  </Text>
                </View>
              </View>

              {result.positions.slice(0, 3).map((position, posIndex) => {
                const { context, isStart, isEnd } = getContextAroundMatch(content, position);
                return (
                  <View key={posIndex} style={styles.contextContainer}>
                    <View style={styles.contextHeader}>
                      <MapPin size={14} color={colors.darkGray} />
                      <Text style={[styles.contextLabel, { color: colors.darkGray }]}>
                        Match {posIndex + 1}
                      </Text>
                    </View>
                    <Text style={[styles.contextText, { color: colors.text }]}>
                      {!isStart && '...'}
                      {highlightText(context, result.keyword).split('**').map((part, i) => 
                        i % 2 === 1 ? (
                          <Text key={i} style={[styles.highlight, { backgroundColor: colors.purple.light }]}>
                            {part}
                          </Text>
                        ) : (
                          <Text key={i}>{part}</Text>
                        )
                      )}
                      {!isEnd && '...'}
                    </Text>
                  </View>
                );
              })}

              {result.positions.length > 3 && (
                <Text style={[styles.moreMatches, { color: colors.darkGray }]}>
                  +{result.positions.length - 3} more matches
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  noResults: {
    alignItems: "center",
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: "center",
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultHeader: {
    marginBottom: 12,
  },
  keywordContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  keyword: {
    fontSize: 16,
    fontWeight: "600",
  },
  matchCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  contextContainer: {
    marginBottom: 8,
  },
  contextHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  contextText: {
    fontSize: 14,
    lineHeight: 20,
  },
  highlight: {
    color: "#fff",
    fontWeight: "600",
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  moreMatches: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
  },
});