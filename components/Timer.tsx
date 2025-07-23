import React, { useEffect, useState } from "react";
import { StyleSheet, Text, Platform } from "react-native";

interface TimerProps {
  isRecording: boolean;
  startTime: number | null;
}

export default function Timer({ isRecording, startTime }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording && startTime) {
      interval = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    } else if (!isRecording) {
      setElapsed(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, startTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <Text style={styles.timer}>
      {formatTime(elapsed)}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 48,
    fontWeight: "300",
    color: "#fff",
    marginVertical: 30,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});