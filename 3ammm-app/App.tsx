import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AppProvider, useApp } from "./src/lib/AppContext";
import WorshiperApp from "./src/navigation/WorshiperApp";
import { Colors } from "./src/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootRouter() {
  const { loading } = useApp();

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
