import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AUTH_STORAGE_KEY = "auth_user";
const PROFILE_PICTURE_KEY = "profile_picture";

interface User {
  id: string;
  email: string;
  created_at: string;
  profilePicture?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || new Date().toISOString(),
          };
          
          // Load profile picture for this user
          const profilePicture = await AsyncStorage.getItem(`${PROFILE_PICTURE_KEY}_${user.id}`);
          if (profilePicture) {
            user.profilePicture = profilePicture;
          }
          
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else if (event === 'SIGNED_OUT') {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Session error:", error);
      }
      
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          created_at: session.user.created_at || new Date().toISOString(),
        };
        
        // Load profile picture for this user
        const profilePicture = await AsyncStorage.getItem(`${PROFILE_PICTURE_KEY}_${user.id}`);
        if (profilePicture) {
          user.profilePicture = profilePicture;
        }
        
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Check AsyncStorage for cached user
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const user = JSON.parse(stored) as User;
          
          // Load profile picture for this user
          const profilePicture = await AsyncStorage.getItem(`${PROFILE_PICTURE_KEY}_${user.id}`);
          if (profilePicture) {
            user.profilePicture = profilePicture;
          }
          
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in with:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error("Sign in failed - no user data received");
      }

      console.log("Sign in successful:", data.user.email);
      // Auth state will be updated by the onAuthStateChange listener
      
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign up with:", email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("Signup error:", error);
        
        if (error.message.includes('User already registered')) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        } else if (error.message.includes('Invalid email')) {
          throw new Error("Please enter a valid email address.");
        } else if (error.message.includes('Password')) {
          throw new Error("Password must be at least 6 characters long.");
        }
        
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error("Account creation failed. Please try again.");
      }

      console.log("User created successfully:", data.user.email);
      
      // Check if email confirmation is required
      if (!data.user.email_confirmed_at && data.user.confirmation_sent_at) {
        throw new Error("Please check your email and click the confirmation link to complete signup.");
      }
      
      // If user is immediately confirmed, they will be signed in automatically
      // and the auth state will be updated by the onAuthStateChange listener
      
    } catch (error) {
      console.error("Sign up failed:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log("Starting sign out process...");
      
      // Set loading state while signing out
      setAuthState(prev => ({
        ...prev,
        isLoading: true
      }));
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        throw error;
      }
      
      console.log("Supabase sign out successful");
      
      // Force immediate local cleanup to ensure state is cleared
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      
      // Immediately update local state (don't wait for onAuthStateChange)
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      console.log("Sign out completed and state cleared");
      
    } catch (error) {
      console.error('Sign out failed:', error);
      
      // Force local cleanup even if Supabase signout fails
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      // Don't throw the error - we want signout to always succeed locally
      console.log("Forced local sign out completed");
    }
  };

  const updateProfilePicture = async (imageUri: string) => {
    if (!authState.user) return;

    try {
      // Save profile picture to AsyncStorage with user-specific key
      await AsyncStorage.setItem(`${PROFILE_PICTURE_KEY}_${authState.user.id}`, imageUri);
      
      // Update user state
      const updatedUser = { ...authState.user, profilePicture: imageUri };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));
    } catch (error) {
      console.error("Error updating profile picture:", error);
      throw error;
    }
  };

  const removeProfilePicture = async () => {
    if (!authState.user) return;

    try {
      // Remove profile picture from AsyncStorage
      await AsyncStorage.removeItem(`${PROFILE_PICTURE_KEY}_${authState.user.id}`);
      
      // Update user state
      const updatedUser = { ...authState.user };
      delete updatedUser.profilePicture;
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));
    } catch (error) {
      console.error("Error removing profile picture:", error);
      throw error;
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    updateProfilePicture,
    removeProfilePicture,
  };
});