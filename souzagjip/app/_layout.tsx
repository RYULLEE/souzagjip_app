import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout(): JSX.Element {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor="#F5F0E8" translucent={false} />
          <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="index" />
            <Stack.Screen name="reader/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile/index" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { backgroundColor: '#F5F0E8' },
});