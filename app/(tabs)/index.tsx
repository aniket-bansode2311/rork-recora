import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useRecordings } from "@/hooks/use-recordings";
import { useTheme } from "@/hooks/use-theme";
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

  const startRecording = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      const newRecording = new Audio.Recording();
      
      if (Platform.OS !== 'web') {
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
      } else {
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
      }

      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setStartTime(Date.now());
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error("Failed to start recording", error);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const uri = recording.getURI();
      if (!uri) {
        throw new Error("Recording URI is null");
      }

      const duration = startTime ? Date.now() - startTime : 0;
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      // Generate a unique ID using timestamp and random number
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newRecording: RecordingType = {
        id: uniqueId,
        uri,
        duration,
        title: `Recording ${new Date().toLocaleString()}`,
        createdAt: new Date(),
        fileType,
      };

      addRecording(newRecording);
      setRecording(null);
      setIsRecording(false);
      setStartTime(null);
    } catch (error) {
      console.error("Failed to stop recording", error);
      Alert.alert("Error", "Failed to stop recording");
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
});