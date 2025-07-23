import React from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { Wifi, WifiOff, RefreshCw, CheckCircle } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useRecordings } from "@/hooks/use-recordings";
import { useNotes } from "@/hooks/use-notes";

export default function SyncStatusBanner() {
  const { colors } = useTheme();
  const { 
    unsyncedCount: unsyncedRecordings, 
    isSyncing: isRecordingsSyncing, 
    syncUnsyncedRecordings 
  } = useRecordings();
  const { 
    unsyncedCount: unsyncedNotes, 
    isSyncing: isNotesSyncing, 
    syncUnsyncedNotes 
  } = useNotes();

  const totalUnsynced = unsyncedRecordings + unsyncedNotes;
  const isSyncing = isRecordingsSyncing || isNotesSyncing;

  if (totalUnsynced === 0) {
    return null;
  }

  const handleSync = async () => {
    if (isSyncing) return;
    
    await Promise.all([
      syncUnsyncedRecordings(),
      syncUnsyncedNotes()
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.purple.light }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <WifiOff size={18} color="#fff" />
          )}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isSyncing ? "Syncing..." : `${totalUnsynced} item${totalUnsynced !== 1 ? 's' : ''} not synced`}
          </Text>
          <Text style={styles.subtitle}>
            {isSyncing ? "Uploading to server" : "Tap to sync with server"}
          </Text>
        </View>

        {!isSyncing && (
          <Pressable
            onPress={handleSync}
            style={({ pressed }) => [
              styles.syncButton,
              { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              pressed && styles.pressed
            ]}
          >
            <RefreshCw size={16} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
  },
  syncButton: {
    padding: 8,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});