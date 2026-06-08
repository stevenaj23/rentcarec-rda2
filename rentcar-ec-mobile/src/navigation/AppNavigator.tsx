import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';
import BrandLogo from '../components/BrandLogo';

import { VehiculoEventsProvider } from '../context/VehiculoEventsContext';
import LoginScreen          from '../screens/auth/LoginScreen';
import RegisterScreen       from '../screens/auth/RegisterScreen';
import HomeScreen           from '../screens/marketplace/HomeScreen';
import SearchScreen         from '../screens/marketplace/SearchScreen';
import VehiculoDetailScreen from '../screens/marketplace/VehiculoDetailScreen';
import ReservaFormScreen    from '../screens/marketplace/ReservaFormScreen';
import MisReservasScreen    from '../screens/cliente/MisReservasScreen';
import ReservaDetailScreen  from '../screens/cliente/ReservaDetailScreen';
import ProfileScreen        from '../screens/cliente/ProfileScreen';

export type RootStackParams = {
  Login:          undefined;
  Register:       undefined;
  Main:           undefined;
  VehiculoDetail: { vehiculoId: string; fechaInicio?: string; fechaFin?: string };
  ReservaForm:    { vehiculoId: string; fechaInicio?: string; fechaFin?: string };
  ReservaDetail:  { reservaId: string };
};

export type TabParams = {
  HomeTab:     undefined;
  SearchTab:   undefined;
  ReservasTab: undefined;
  ProfileTab:  undefined;
};

const Stack    = createStackNavigator<RootStackParams>();
const Tab      = createBottomTabNavigator<TabParams>();
const HomeStack = createStackNavigator();

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

const HEADER_COMMON = {
  headerStyle:           { backgroundColor: Colors.card },
  headerTintColor:       Colors.text,
  headerTitleStyle:      { color: Colors.text, fontWeight: '700' as const },
  headerShadowVisible:   false,
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...HEADER_COMMON,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
          height:          62,
          paddingBottom:   8,
          paddingTop:      4,
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNav}
        options={{
          headerTitle: () => <BrandLogo size="sm" showTagline={false} />,
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: 'Explorar',
          tabBarLabel: 'Explorar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReservasTab"
        component={MisReservasScreen}
        options={{
          title: 'Mis Reservas',
          tabBarLabel: 'Reservas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Mi Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <VehiculoEventsProvider>
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          ...HEADER_COMMON,
          headerBackTitleVisible: false,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login"    component={LoginScreen}    options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main"           component={HomeTabs}            options={{ headerShown: false }} />
            <Stack.Screen name="VehiculoDetail" component={VehiculoDetailScreen} options={{ title: 'Detalle del vehículo' }} />
            <Stack.Screen name="ReservaForm"    component={ReservaFormScreen}    options={{ title: 'Confirmar reserva' }} />
            <Stack.Screen name="ReservaDetail"  component={ReservaDetailScreen}  options={{ title: 'Detalle de reserva' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </VehiculoEventsProvider>
  );
}
