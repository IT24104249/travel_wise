import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:travelwise_mobile/screens/auth_screen.dart';
import 'package:travelwise_mobile/screens/dashboard_screen.dart';
import 'package:travelwise_mobile/screens/explore_screen.dart';
import 'package:travelwise_mobile/screens/settlement_screen.dart';
import 'package:travelwise_mobile/screens/transport_screen.dart';
import 'package:travelwise_mobile/screens/weather_safety_screen.dart';
import 'package:travelwise_mobile/theme/app_theme.dart';

void main() {
  testWidgets('renders TravelWise AuthScreen with login elements', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const AuthScreen(onSignedIn: _noop),
      ),
    );
    await tester.pump();

    expect(find.text('TravelWise'), findsOneWidget);
    expect(find.text('Sign In to TravelWise'), findsOneWidget);
    expect(find.text('Email Address'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Create Account'), findsOneWidget);
  });

  testWidgets('renders DashboardScreen with quick planner and popular escapes', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const DashboardScreen(),
      ),
    );
    await tester.pump();

    expect(find.text('Quick Trip Planner'), findsOneWidget);
    expect(find.text('Plan My Trip'), findsOneWidget);
    expect(find.text('Destination Weather Radar'), findsOneWidget);
    expect(find.text('Trip To Ella'), findsOneWidget);
    expect(find.text('Trip To Sigiriya'), findsOneWidget);
  });

  testWidgets('renders ExploreScreen with Sri Lanka attractions and filters', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const ExploreScreen(),
      ),
    );
    await tester.pump();

    expect(find.text('Explore Sri Lanka'), findsOneWidget);
    expect(find.text('Beaches & Coastal'), findsWidgets);
    expect(find.text('Historical Ruins'), findsWidgets);
    expect(find.text('Sigiriya Lion Rock Fortress'), findsOneWidget);
  });

  testWidgets('renders WeatherSafetyScreen with live radar and emergency hotlines', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const WeatherSafetyScreen(),
      ),
    );
    await tester.pump();

    expect(find.text('Weather & Safety Radar'), findsOneWidget);
    expect(find.text('Sri Lanka Emergency Hotlines'), findsOneWidget);
    expect(find.text('Tourist Police Hotline'), findsOneWidget);
    expect(find.text('1912'), findsOneWidget);
    expect(find.text('1990'), findsOneWidget);
  });

  testWidgets('renders TransportScreen with train routes and vehicle rentals', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const TransportScreen(),
      ),
    );
    await tester.pump();

    expect(find.text('Transit & Rental Vehicles'), findsOneWidget);
    expect(find.text('Train Routes & Fares'), findsOneWidget);
    expect(find.text('Rental Vehicles'), findsOneWidget);
  });

  testWidgets('renders SettlementScreen with debt matrix', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const SettlementScreen(),
      ),
    );
    await tester.pump();

    expect(find.text('Group Debt Settlement'), findsOneWidget);
  });
}

void _noop() {}
