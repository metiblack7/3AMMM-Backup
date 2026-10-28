import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppProvider, useApp } from "./src/lib/AppContext";
import WorshiperApp from "./src/navigation/WorshiperApp";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { Colors } from "./src/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootRouter() {
  const { loading, t } = useApp();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState("");

  const checkOnboarding = useCallback(async () => {
    setCheckError("");
    try {
      const value = await AsyncStorage.getItem("3ammm_onboarded");
      setOnboarded(value === "true");
    } catch (error) {
      console.error("Could not check onboarding status:", error);
      setCheckError(t.onboardingStatusError);
    }
  }, [t.onboardingStatusError]);

  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding]);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem("3ammm_onboarded", "true");
    setOnboarded(true);
  }, []);

  if (checkError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#010f18",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
        <Text
          style={{
            color: "#ffffff",
            textAlign: "center",
            marginBottom: 16,
          }}>
          {checkError}
        </Text>
        <TouchableOpacity accessibilityRole="button" onPress={checkOnboarding}>
          <Text style={{ color: Colors.gold, fontWeight: "700" }}>
            {t.tryAgain}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (onboarded === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#010f18",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (!onboarded) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }
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
