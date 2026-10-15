import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'dashboard_screen.dart';
import 'explore_screen.dart';
import 'profile_screen.dart';
import 'trips_screen.dart';
import 'weather_safety_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final VoidCallback onSignOut;
  const MainNavigationScreen({required this.onSignOut, super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  final GlobalKey<TripsScreenState> _tripsKey = GlobalKey<TripsScreenState>();

  void _handlePlanTrip(String destination, String name) {
    setState(() => _currentIndex = 2);
    // Open trip dialog on TripsScreen
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _tripsKey.currentState?.showCreateTripDialog(
        destination: destination,
        name: name,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(
        onPlanTrip: _handlePlanTrip,
        onOpenWeather: () => setState(() => _currentIndex = 3),
      ),
      ExploreScreen(onPlanTrip: _handlePlanTrip),
      TripsScreen(key: _tripsKey),
      const WeatherSafetyScreen(),
      ProfileScreen(onSignOut: widget.onSignOut),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: AppTheme.primary),
            label: "Home",
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore, color: AppTheme.primary),
            label: "Explore",
          ),
          NavigationDestination(
            icon: Icon(Icons.luggage_outlined),
            selectedIcon: Icon(Icons.luggage, color: AppTheme.primary),
            label: "My Trips",
          ),
          NavigationDestination(
            icon: Icon(Icons.wb_sunny_outlined),
            selectedIcon: Icon(Icons.wb_sunny, color: AppTheme.primary),
            label: "Weather",
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppTheme.primary),
            label: "Account",
          ),
        ],
      ),
    );
  }
}
