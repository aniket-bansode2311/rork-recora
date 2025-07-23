import React, { useState } from "react";
import { StyleSheet, Text, View, Image, Pressable, ScrollView, Alert, ActionSheetIOS, Platform } from "react-native";
import { Stack } from "expo-router";
import { Settings, HelpCircle, Info, Bell, Moon, Sun, LogOut, Camera, Edit3, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useRecordings } from "@/hooks/use-recordings";
import { useNotes } from "@/hooks/use-notes";

export default function ProfileScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, signOut, updateProfilePicture, removeProfilePicture } = useAuth();
  const { recordings, clearAllRecordings } = useRecordings();
  const { notes, clearAllNotes } = useNotes();
  const [isUpdatingPicture, setIsUpdatingPicture] = useState(false);

  // Calculate real-time stats
  const recordingsCount = recordings.length;
  const transcriptionsCount = recordings.filter(r => r.transcription).length;
  const notesCount = notes.length;

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" as const },
        { 
          text: "Sign Out", 
          style: "destructive" as const,
          onPress: async () => {
            try {
              // Clear user-specific data
              await clearAllRecordings();
              await clearAllNotes();
              
              await signOut();
              // No need to manually redirect - auth state change will handle it
            } catch (error) {
              console.error("Sign out error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        },
      ]
    );
  };

  const handleProfilePicturePress = () => {
    const options = user?.profilePicture 
      ? ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel']
      : ['Take Photo', 'Choose from Library', 'Cancel'];
    
    const destructiveButtonIndex = user?.profilePicture ? 2 : undefined;
    const cancelButtonIndex = user?.profilePicture ? 3 : 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            takePhoto();
          } else if (buttonIndex === 1) {
            pickImage();
          } else if (buttonIndex === 2 && user?.profilePicture) {
            removePhoto();
          }
        }
      );
    } else {
      // For Android, show a simple alert
      Alert.alert(
        "Profile Picture",
        "Choose an option",
        [
          { text: "Take Photo", onPress: takePhoto },
          { text: "Choose from Library", onPress: pickImage },
          ...(user?.profilePicture ? [{ text: "Remove Photo", onPress: removePhoto, style: "destructive" as const }] : []),
          { text: "Cancel", style: "cancel" as const }
        ]
      );
    }
  };

  const takePhoto = async () => {
    try {
      setIsUpdatingPicture(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await updateProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    } finally {
      setIsUpdatingPicture(false);
    }
  };

  const pickImage = async () => {
    try {
      setIsUpdatingPicture(true);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await updateProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    } finally {
      setIsUpdatingPicture(false);
    }
  };

  const removePhoto = async () => {
    try {
      setIsUpdatingPicture(true);
      await removeProfilePicture();
    } catch (error) {
      console.error("Error removing photo:", error);
      Alert.alert("Error", "Failed to remove photo. Please try again.");
    } finally {
      setIsUpdatingPicture(false);
    }
  };

  const menuItems = [
    { 
      icon: <Settings size={22} color={colors.darkGray} />, 
      title: "Settings", 
      onPress: () => {} 
    },
    { 
      icon: <Bell size={22} color={colors.darkGray} />, 
      title: "Notifications", 
      onPress: () => {} 
    },
    { 
      icon: theme === "light" ? <Moon size={22} color={colors.darkGray} /> : <Sun size={22} color={colors.darkGray} />, 
      title: `Switch to ${theme === "light" ? "Dark" : "Light"} Mode`, 
      onPress: toggleTheme 
    },
    { 
      icon: <HelpCircle size={22} color={colors.darkGray} />, 
      title: "Help & Support", 
      onPress: () => {} 
    },
    { 
      icon: <Info size={22} color={colors.darkGray} />, 
      title: "About", 
      onPress: () => {} 
    },
    { 
      icon: <LogOut size={22} color={colors.danger} />, 
      title: "Sign Out", 
      onPress: handleSignOut,
      isDestructive: true
    },
  ];

  const defaultProfileImage = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60";

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: "Profile",
          headerTitleStyle: [styles.headerTitle, { color: colors.purple.primary }],
          headerStyle: {
            backgroundColor: colors.background,
          },
        }} 
      />

      <View style={styles.profileSection}>
        <Pressable 
          onPress={handleProfilePicturePress}
          disabled={isUpdatingPicture}
          style={styles.profileImageContainer}
        >
          <Image
            source={{ uri: user?.profilePicture || defaultProfileImage }}
            style={styles.profileImage}
          />
          <View style={[styles.editIconContainer, { backgroundColor: colors.purple.primary }]}>
            <Camera size={16} color="#fff" />
          </View>
        </Pressable>
        
        <Text style={[styles.profileName, { color: colors.purple.primary }]}>
          {user?.email?.split('@')[0] || "User"}
        </Text>
        <Text style={[styles.profileEmail, { color: colors.darkGray }]}>
          {user?.email || "user@example.com"}
        </Text>
        
        <View style={[styles.statsContainer, { backgroundColor: colors.lightGray }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.purple.primary }]}>{recordingsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.darkGray }]}>Recordings</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.mediumGray }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.purple.primary }]}>{transcriptionsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.darkGray }]}>Transcriptions</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.mediumGray }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.purple.primary }]}>{notesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.darkGray }]}>Notes</Text>
          </View>
        </View>
      </View>

      <View style={[styles.menuContainer, { backgroundColor: colors.background }]}>
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.lightGray },
              pressed && styles.menuItemPressed,
              index === menuItems.length - 1 && styles.menuItemLast
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuIconContainer}>{item.icon}</View>
            <Text style={[
              styles.menuTitle, 
              { color: item.isDestructive ? colors.danger : colors.text }
            ]}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.darkGray }]}>Audio Transcriber v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "600",
  },
  profileSection: {
    alignItems: "center",
    padding: 20,
    paddingTop: 30,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    justifyContent: "space-around",
    marginTop: 10,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    marginHorizontal: 10,
  },
  menuContainer: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuItemPressed: {
    backgroundColor: "rgba(124, 58, 237, 0.05)",
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    marginRight: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
  },
});