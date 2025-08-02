import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { Send, Bot, User, FileText, Sparkles } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRecordings } from "@/hooks/use-recordings";
import { useNotes } from "@/hooks/use-notes";
import { Recording } from "@/types/recording";
import { Note } from "@/types/note";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sourceType?: 'recording' | 'note';
  sourceId?: string;
  sourceTitle?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const { recordings } = useRecordings();
  const { notes } = useNotes();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [currentSession, setCurrentSession] = useState<ChatSession>({
    id: Date.now().toString(),
    title: "New Chat",
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [currentSession.messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setCurrentSession(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      updatedAt: new Date(),
    }));
    
    setInputText("");
    setIsLoading(true);

    try {
      // Prepare context from recordings and notes
      const context = prepareContext();
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant helping users analyze their audio transcriptions and notes. Here's the available context:\n\n${context}\n\nPlease provide helpful insights, summaries, or answers based on this content. If the user asks about specific recordings or notes, reference them by their titles.`
        },
        ...currentSession.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: userMessage.content
        }
      ];

      console.log('Sending request to AI API with messages:', messages.length);
      console.log('Context length:', context.length);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log('AI Response received:', data);
      
      if (!data.completion) {
        throw new Error('Invalid response format: missing completion field');
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.completion,
        timestamp: new Date(),
      };

      setCurrentSession(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        updatedAt: new Date(),
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again with a shorter message.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. The AI service is temporarily unavailable.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('413')) {
          errorMessage = 'Request too large. Please try with less context or shorter messages.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const prepareContext = (): string => {
    let context = "";
    const MAX_CONTEXT_LENGTH = 8000; // Limit context to prevent API issues
    
    // Add recordings context (limit to most recent 5 recordings)
    if (recordings.length > 0) {
      context += "RECORDINGS:\n";
      const recentRecordings = recordings.slice(0, 5);
      
      for (const recording of recentRecordings) {
        const recordingContext = `\nTitle: ${recording.title}\nDate: ${new Date(recording.createdAt).toLocaleDateString()}\n`;
        
        if (recording.transcription) {
          // Limit transcription length to prevent context overflow
          const transcription = recording.transcription.length > 1000 
            ? recording.transcription.substring(0, 1000) + "...[truncated]"
            : recording.transcription;
          const transcriptionContext = `Transcription: ${transcription}\n`;
          
          if (context.length + recordingContext.length + transcriptionContext.length < MAX_CONTEXT_LENGTH) {
            context += recordingContext + transcriptionContext;
          }
        } else if (recording.speakerSegments && recording.speakerSegments.length > 0) {
          let speakerContext = "Speaker Segments:\n";
          recording.speakerSegments.forEach(segment => {
            speakerContext += `${segment.speaker}: ${segment.text}\n`;
          });
          
          if (context.length + recordingContext.length + speakerContext.length < MAX_CONTEXT_LENGTH) {
            context += recordingContext + speakerContext;
          }
        } else {
          if (context.length + recordingContext.length < MAX_CONTEXT_LENGTH) {
            context += recordingContext;
          }
        }
        
        context += "---\n";
        
        // Break if we're approaching the limit
        if (context.length > MAX_CONTEXT_LENGTH * 0.8) break;
      }
    }
    
    // Add notes context (limit to most recent 5 notes)
    if (notes.length > 0 && context.length < MAX_CONTEXT_LENGTH * 0.9) {
      context += "\nNOTES:\n";
      const recentNotes = notes.slice(0, 5);
      
      for (const note of recentNotes) {
        const noteContent = note.content.length > 500 
          ? note.content.substring(0, 500) + "...[truncated]"
          : note.content;
          
        const noteContext = `\nTitle: ${note.title}\nContent: ${noteContent}\nDate: ${new Date(note.createdAt).toLocaleDateString()}\n---\n`;
        
        if (context.length + noteContext.length < MAX_CONTEXT_LENGTH) {
          context += noteContext;
        } else {
          break;
        }
      }
    }
    
    return context || "No recordings or notes available.";
  };

  const startNewChat = () => {
    setCurrentSession({
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer
      ]}>
        <View style={[
          styles.messageAvatar,
          { backgroundColor: isUser ? colors.purple.primary : colors.blue.primary }
        ]}>
          {isUser ? (
            <User size={16} color="#fff" />
          ) : (
            <Bot size={16} color="#fff" />
          )}
        </View>
        
        <View style={[
          styles.messageBubble,
          {
            backgroundColor: isUser ? colors.purple.primary : colors.lightGray,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
          }
        ]}>
          <Text style={[
            styles.messageText,
            { color: isUser ? '#fff' : colors.text }
          ]}>
            {message.content}
          </Text>
          
          <Text style={[
            styles.messageTime,
            { color: isUser ? 'rgba(255,255,255,0.7)' : colors.darkGray }
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderSourcesPanel = () => {
    if (!showSources) return null;
    
    return (
      <View style={[styles.sourcesPanel, { backgroundColor: colors.lightGray }]}>
        <Text style={[styles.sourcesPanelTitle, { color: colors.text }]}>Available Sources</Text>
        
        {recordings.length > 0 && (
          <View style={styles.sourcesSection}>
            <Text style={[styles.sourcesSectionTitle, { color: colors.purple.primary }]}>Recordings ({recordings.length})</Text>
            {recordings.slice(0, 3).map((recording: Recording) => (
              <View key={recording.id} style={styles.sourceItem}>
                <FileText size={14} color={colors.darkGray} />
                <Text style={[styles.sourceItemText, { color: colors.text }]} numberOfLines={1}>
                  {recording.title}
                </Text>
              </View>
            ))}
            {recordings.length > 3 && (
              <Text style={[styles.moreSourcesText, { color: colors.darkGray }]}>
                +{recordings.length - 3} more recordings
              </Text>
            )}
          </View>
        )}
        
        {notes.length > 0 && (
          <View style={styles.sourcesSection}>
            <Text style={[styles.sourcesSectionTitle, { color: colors.blue.primary }]}>Notes ({notes.length})</Text>
            {notes.slice(0, 3).map((note: Note) => (
              <View key={note.id} style={styles.sourceItem}>
                <FileText size={14} color={colors.darkGray} />
                <Text style={[styles.sourceItemText, { color: colors.text }]} numberOfLines={1}>
                  {note.title}
                </Text>
              </View>
            ))}
            {notes.length > 3 && (
              <Text style={[styles.moreSourcesText, { color: colors.darkGray }]}>
                +{notes.length - 3} more notes
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen 
        options={{ 
          title: "AI Chat",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable
              onPress={() => setShowSources(!showSources)}
              style={({ pressed }) => [
                styles.headerButton,
                { backgroundColor: colors.purple.primary },
                pressed && styles.pressed
              ]}
            >
              <Sparkles size={18} color="#fff" />
            </Pressable>
          ),
        }} 
      />
      
      {renderSourcesPanel()}
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {currentSession.messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Bot size={48} color={colors.darkGray} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Start a conversation</Text>
            <Text style={[styles.emptyStateSubtitle, { color: colors.darkGray }]}>
              Ask questions about your recordings and notes. I can help you analyze, summarize, or find specific information.
            </Text>
            
            <View style={styles.suggestedQuestions}>
              <Text style={[styles.suggestedQuestionsTitle, { color: colors.text }]}>Try asking:</Text>
              {[
                "Summarize my recent recordings",
                "What are the main topics discussed?",
                "Find mentions of specific keywords",
                "Compare different recordings"
              ].map((question, index) => (
                <Pressable
                  key={index}
                  onPress={() => setInputText(question)}
                  style={({ pressed }) => [
                    styles.suggestedQuestion,
                    { backgroundColor: colors.lightGray },
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.suggestedQuestionText, { color: colors.text }]}>
                    {question}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          currentSession.messages.map(renderMessage)
        )}
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={[styles.messageAvatar, { backgroundColor: colors.blue.primary }]}>
              <Bot size={16} color="#fff" />
            </View>
            <View style={[styles.loadingBubble, { backgroundColor: colors.lightGray }]}>
              <ActivityIndicator size="small" color={colors.blue.primary} />
              <Text style={[styles.loadingText, { color: colors.darkGray }]}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>
      
      <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.mediumGray }]}>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.lightGray,
              color: colors.text,
              borderColor: colors.mediumGray,
            }
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your recordings and notes..."
          placeholderTextColor={colors.darkGray}
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        
        <Pressable
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: inputText.trim() && !isLoading ? colors.purple.primary : colors.mediumGray,
            },
            pressed && styles.pressed
          ]}
        >
          <Send size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  sourcesPanel: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sourcesPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sourcesSection: {
    marginBottom: 12,
  },
  sourcesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sourceItemText: {
    fontSize: 14,
    flex: 1,
  },
  moreSourcesText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestedQuestions: {
    width: '100%',
  },
  suggestedQuestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestedQuestion: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestedQuestionText: {
    fontSize: 14,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    flexDirection: 'row-reverse',
  },
  assistantMessageContainer: {
    flexDirection: 'row',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});