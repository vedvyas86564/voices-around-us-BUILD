import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { useAuth } from '../hooks/useAuth';

import AuthScreen from '../screens/AuthScreen';
import MapScreen from '../screens/MapScreen';
import ExploreScreen from '../screens/ExploreScreen';
import SubmitScreen from '../screens/SubmitScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StoryViewScreen from '../screens/StoryViewScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ icon, label, focused }) {
  return (
    <View style={styles.tabItem}>
      {focused && <View style={styles.tabDot} />}
      <View style={[styles.tabBubble, focused && styles.tabBubbleOn]}>
        <Text style={[styles.tabIcon, focused && styles.tabIconOn]}>
          {icon}
        </Text>
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelOn]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🗺" label="Map" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="✦" label="Explore" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ShareTab"
        component={SubmitScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⊕" label="Share" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="◉" label="Me" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingLogo}>🗺</Text>
        <Text style={styles.loadingText}>Voices Around Us</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : null}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="Submit"
          component={SubmitScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="StoryView" component={StoryViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 84,
    backgroundColor: 'rgba(250,248,243,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.sandDark,
    paddingTop: 10,
    paddingBottom: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 50,
    position: 'relative',
  },
  tabDot: {
    position: 'absolute',
    top: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.amber,
  },
  tabBubble: {
    width: 46,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabBubbleOn: {
    backgroundColor: colors.amberGlow,
  },
  tabIcon: {
    fontSize: 19,
    color: colors.muted,
  },
  tabIconOn: {
    color: colors.amber,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    fontFamily: fonts.sansMedium,
    color: colors.muted,
  },
  tabLabelOn: {
    color: colors.amber,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    fontSize: 52,
    marginBottom: 16,
  },
  loadingText: {
    fontFamily: fonts.serifMedium,
    fontSize: 24,
    color: colors.ink,
  },
});
