import React from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { Sparkles, FileText, List, Wand2, X } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";

interface AIToolbarProps {
  onProcess: (type: 'summarize' | 'keyPoints' | 'format' | 'improve') => void;
  isProcessing: boolean;
  onClose: () => void;
}

export default function AIToolbar({ onProcess, isProcessing, onClose }: AIToolbarProps) {
  const { colors } = useTheme();

  const tools = [
    {
      id: 'summarize' as const,
      icon: <FileText size={16} color={colors.purple.primary} />,
      title: "Summarize",
      description: "Create summary"
    },
    {
      id: 'keyPoints' as const,
      icon: <List size={16} color={colors.purple.primary} />,
      title: "Key Points",
      description: "Extract points"
    },
    {
      id: 'format' as const,
      icon: <Wand2 size={16} color={colors.purple.primary} />,
      title: "Format",
      description: "Improve format"
    },
    {
      id: 'improve' as const,
      icon: <Sparkles size={16} color={colors.purple.primary} />,
      title: "Improve",
      description: "Enhance text"
    }
  ];

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.background, 
      borderBottomColor: colors.mediumGray,
      shadowColor: colors.text 
    }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Sparkles size={18} color={colors.purple.primary} />
          <Text style={[styles.title, { color: colors.text }]}>AI Tools</Text>
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton, 
            { backgroundColor: colors.lightGray },
            pressed && styles.pressed
          ]}
        >
          <X size={18} color={colors.darkGray} />
        </Pressable>
      </View>

      <View style={styles.toolsContainer}>
        {tools.map((tool) => (
          <Pressable
            key={tool.id}
            onPress={() => onProcess(tool.id)}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.toolButton,
              { 
                backgroundColor: colors.lightGray,
                borderColor: colors.mediumGray 
              },
              pressed && styles.toolPressed,
              isProcessing && styles.disabled
            ]}
          >
            <View style={styles.toolIconContainer}>
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.purple.primary} />
              ) : (
                tool.icon
              )}
            </View>
            <View style={styles.toolContent}>
              <Text style={[styles.toolTitle, { color: colors.text }]}>
                {tool.title}
              </Text>
              <Text style={[styles.toolDescription, { color: colors.darkGray }]}>
                {tool.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  toolsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  toolButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 70,
  },
  toolPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  toolIconContainer: {
    marginBottom: 6,
  },
  toolContent: {
    alignItems: "center",
  },
  toolTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
    textAlign: "center",
  },
  toolDescription: {
    fontSize: 10,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});