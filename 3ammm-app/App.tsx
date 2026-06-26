import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { AppProvider, useApp } from "./src/lib/AppContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import WorshiperApp from "./src/navigation/WorshiperApp";
import AdminDashboard from "./src/screens/admin/AdminDashboard";
import { Colors } from "./src/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  registerForPushNotificationsOnSignUp,
  setupNotificationListeners,
} from "./src/lib/notifications";

function RootRouter() {
  const { profile, loading, isAdmin } = useApp();
  const [showRegister, setShowRegister] = useState(false);

  // Push notifications setup
  useEffect(() => {
    if (profile) {
      registerForPushNotificationsOnSignUp(profile.name).catch(() => {});
      const cleanup = setupNotificationListeners();
      return cleanup;
    }
  }, [profile]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.navy,
        }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // ✅ FIX: use profile directly (not isAuthenticated)
  if (!profile) {
    if (showRegister)
      return <RegisterScreen onGoLogin={() => setShowRegister(false)} />;
    return <LoginScreen onGoRegister={() => setShowRegister(true)} />;
  }

  if (isAdmin) return <AdminDashboard />;

  return <WorshiperApp />;
}

function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootRouter />
      </AppProvider>
    </SafeAreaProvider>
  );



}

export default App;
