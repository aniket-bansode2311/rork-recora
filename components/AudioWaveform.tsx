import React from "react";
import { StyleSheet, View } from "react-native";

interface AudioWaveformProps {
  isRecording: boolean;
}

export default function AudioWaveform({ isRecording }: AudioWaveformProps) {
  // Generate random heights for the waveform bars
  const generateBars = () => {
    return Array.from({ length: 50 }, () => 
      Math.random() * (isRecording ? 60 : 8) + (isRecording ? 15 : 3)
    );
  };

  const [bars, setBars] = React.useState(generateBars());

  React.useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setBars(generateBars());
      }, 80);
      return () => clearInterval(interval);
    } else {
      setBars(generateBars());
    }
  }, [isRecording]);

  return (
    <View style={styles.container}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            { 
              height, 
              opacity: isRecording ? 1 : 0.4,
            }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    width: "100%",
  },
  bar: {
    width: 2,
    marginHorizontal: 1,
    borderRadius: 1,
    backgroundColor: "#fff",
  },
});