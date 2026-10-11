import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4b9cf1',
        tabBarInactiveTintColor: '#56565a',
        headerStyle: {
          backgroundColor: '#16181b',
          borderBottomWidth: 0,
            },
        headerTintColor: '#ffffff',
        tabBarStyle: {
          backgroundColor: '#16181b',
          borderTopWidth: 0,
            },

      }}>
      <Tabs.Screen name="index" options={{ 
        title: 'InvestSimulator',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />
        ),
      }} />
      <Tabs.Screen name="about" options={{ title: 'O grze',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} size={24} color={color} />
        ),
      }} />
    </Tabs>
  );
}
