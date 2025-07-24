import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useRecordings } from "@/hooks/use-recordings";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import RecordButton from "@/components/RecordButton";
import AudioWaveform from "@/components/AudioWaveform";
import Timer from "@/components/Timer";
import { Recording as RecordingType } from "@/types/recording";

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const { addRecording } = useRecordings();
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAuth();

  const startRecording = async () => {
    try {
      // Check authentication first
      if (!isAuthenticated || !user) {
        Alert.alert("Authentication Required", "Please sign in to record audio.");
        return;
      }

      console.log('Starting recording for user:', user.email);

      if (Platform.OS !== 'web') {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Required", "Please grant microphone permission to record audio.");
          return;
        }
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      const newRecording = new Audio.Recording();
      
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      });

      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setStartTime(Date.now());
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.error('STOP_RECORDING_ERROR: No recording object found');
      return;
    }

    try {
      console.log('STOP_RECORDING: Starting stop process...');
      
      // Step 1: Stop and unload the recording
      console.log('STOP_RECORDING: Stopping and unloading recording...');
      await recording.stopAndUnloadAsync();
      console.log('STOP_RECORDING: Recording stopped and unloaded successfully');
      
      // Step 2: Reset audio mode
      if (Platform.OS !== 'web') {
        console.log('STOP_RECORDING: Resetting audio mode...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('STOP_RECORDING: Audio mode reset successfully');
      }

      // Step 3: Get recording URI
      console.log('STOP_RECORDING: Getting recording URI...');
      const uri = recording.getURI();
      if (!uri) {
        throw new Error("Recording URI is null - recording may have failed");
      }
      console.log('STOP_RECORDING: Recording URI obtained:', uri);

      // Step 4: Calculate duration and file info
      const duration = startTime ? Date.now() - startTime : 0;
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1] || 'wav';
      console.log('STOP_RECORDING: Duration calculated:', duration, 'ms, File type:', fileType);

      // Step 5: Validate user authentication
      if (!user?.id) {
        throw new Error("User not authenticated - cannot save recording");
      }
      console.log('STOP_RECORDING: User authenticated:', user.email);

      // Step 6: Generate unique ID and create recording object
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newRecording: RecordingType = {
        id: uniqueId,
        uri,
        duration,
        title: `Recording ${new Date().toLocaleString()}`,
        createdAt: new Date(),
        fileType,
      };

      console.log('STOP_RECORDING: Recording object created:', {
        id: newRecording.id,
        duration: newRecording.duration,
        fileType: newRecording.fileType,
        title: newRecording.title,
        userId: user.id,
        uriLength: uri.length
      });

      // Step 7: Save recording (this will trigger the mutation)
      console.log('STOP_RECORDING: Calling addRecording...');
      try {
        addRecording(newRecording);
        console.log('STOP_RECORDING: addRecording called successfully');
      } catch (addError) {
        console.error('STOP_RECORDING_ERROR: Failed to call addRecording:', addError);
        throw new Error(`Failed to save recording: ${addError instanceof Error ? addError.message : 'Unknown error'}`);
      }
      
      // Step 8: Reset component state
      setRecording(null);
      setIsRecording(false);
      setStartTime(null);
      console.log('STOP_RECORDING: Component state reset');
      
      console.log('STOP_RECORDING: Process completed successfully');
      
      // Show success message (but note: this doesn't guarantee database save)
      Alert.alert("Recording Stopped", "Recording has been processed. Check the History tab to verify it was saved.");
      
    } catch (error) {
      console.error('STOP_RECORDING_ERROR: Failed to stop recording:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        user: user?.email,
        hasRecording: !!recording,
        startTime
      });
      
      // Reset state even on error
      setRecording(null);
      setIsRecording(false);
      setStartTime(null);
      
      Alert.alert(
        "Recording Error", 
        `Failed to process recording: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: "Recording",
          headerShown: false,
        }} 
      />

      <LinearGradient
        colors={colors.gradients.purple}
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Recording</Text>
          
          <View style={styles.waveformContainer}>
            <AudioWaveform isRecording={isRecording} />
          </View>

          <Timer isRecording={isRecording} startTime={startTime} />

          <Text style={styles.instructions}>
            {isRecording 
              ? "Tap to stop recording" 
              : "Tap to start recording"}
          </Text>
          
          {/* Debug info */}
          {user && (
            <Text style={styles.debugText}>
              Signed in as: {user.email}
            </Text>
          )}
          {!isAuthenticated && (
            <Text style={styles.debugText}>
              Please sign in to record audio
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <RecordButton 
              isRecording={isRecording} 
              onPress={toggleRecording} 
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 40,
    textAlign: "center",
  },
  waveformContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    height: 120,
  },
  instructions: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 60,
    textAlign: "center",
  },
  buttonContainer: {
    marginBottom: 40,
  },
  debugText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 10,
  },
});