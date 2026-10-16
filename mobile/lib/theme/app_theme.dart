import 'package:flutter/material.dart';

class ThemeManager {
  static final ValueNotifier<ThemeMode> themeMode =
      ValueNotifier<ThemeMode>(ThemeMode.light);

  static void toggleTheme() {
    themeMode.value =
        themeMode.value == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
  }

  static bool get isDark => themeMode.value == ThemeMode.dark;
}

class AppTheme {
  // Brand Colors
  static const Color primary = Color(0xFF0D9488); // Teal-600
  static const Color primaryDark = Color(0xFF0F766E); // Teal-700
  static const Color primaryLight = Color(0xFF14B8A6); // Teal-500
  static const Color secondary = Color(0xFFF59E0B); // Amber-500
  static const Color secondaryDark = Color(0xFFD97706); // Amber-600
  static const Color danger = Color(0xFFEF4444); // Red-500
  static const Color success = Color(0xFF10B981); // Emerald-500

  // Light Palette (Soft, eye-comfort warm slate - no harsh pure white glare)
  static const Color lightBackground = Color(0xFFF8FAFC); // Slate-50
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCardBg = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE2E8F0); // Slate-200
  static const Color lightTextMain = Color(0xFF0F172A); // Slate-900 (High contrast)
  static const Color lightTextMuted = Color(0xFF475569); // Slate-600 (Very readable)
  static const Color lightTextSecondary = Color(0xFF64748B); // Slate-500

  // Dark Palette (Obsidian slate & deep luxury navy)
  static const Color darkBackground = Color(0xFF0B1120); // Obsidian Navy
  static const Color darkSurface = Color(0xFF1E293B); // Slate-800
  static const Color darkCardBg = Color(0xFF1E293B);
  static const Color darkBorder = Color(0xFF334155); // Slate-700
  static const Color darkTextMain = Color(0xFFF8FAFC); // Slate-50
  static const Color darkTextMuted = Color(0xFF94A3B8); // Slate-400
  static const Color darkTextSecondary = Color(0xFF64748B);

  // Dynamic context-aware helpers
  static bool isDarkMode(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark;
  static Color getBackground(BuildContext context) =>
      isDarkMode(context) ? darkBackground : lightBackground;
  static Color getSurface(BuildContext context) =>
      isDarkMode(context) ? darkSurface : lightSurface;
  static Color getCardBg(BuildContext context) =>
      isDarkMode(context) ? darkCardBg : lightCardBg;
  static Color getBorder(BuildContext context) =>
      isDarkMode(context) ? darkBorder : lightBorder;
  static Color getTextMain(BuildContext context) =>
      isDarkMode(context) ? darkTextMain : lightTextMain;
  static Color getTextMuted(BuildContext context) =>
      isDarkMode(context) ? darkTextMuted : lightTextMuted;

  // Backward compatibility aliases
  static const Color background = lightBackground;
  static const Color surface = lightSurface;
  static const Color cardBackground = Color(0xFF0D2130);
  static const Color textMain = lightTextMain;
  static const Color textPrimary = lightTextMain;
  static const Color textMuted = lightTextMuted;
  static const Color textSecondary = lightTextSecondary;

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: secondary,
        surface: lightSurface,
        onSurface: lightTextMain,
        outline: lightBorder,
      ),
      scaffoldBackgroundColor: lightBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: lightSurface,
        foregroundColor: lightTextMain,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        iconTheme: IconThemeData(color: lightTextMain),
        titleTextStyle: TextStyle(
          color: lightTextMain,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: lightCardBg,
        elevation: 1,
        shadowColor: const Color(0x0C0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: lightBorder, width: 1),
        ),
        margin: const EdgeInsets.symmetric(vertical: 6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        labelStyle: const TextStyle(color: lightTextMuted, fontSize: 13, fontWeight: FontWeight.w500),
        hintStyle: const TextStyle(color: lightTextSecondary, fontSize: 13),
        prefixIconColor: lightTextMuted,
        suffixIconColor: lightTextMuted,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: lightSurface,
        elevation: 4,
        indicatorColor: primary.withValues(alpha: 0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(color: primary, fontWeight: FontWeight.bold, fontSize: 12);
          }
          return const TextStyle(color: lightTextMuted, fontSize: 12);
        }),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: primaryLight,
        secondary: secondary,
        surface: darkSurface,
        onSurface: darkTextMain,
        outline: darkBorder,
      ),
      scaffoldBackgroundColor: darkBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: darkSurface,
        foregroundColor: darkTextMain,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        iconTheme: IconThemeData(color: darkTextMain),
        titleTextStyle: TextStyle(
          color: darkTextMain,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: darkCardBg,
        elevation: 2,
        shadowColor: Colors.black.withValues(alpha: 0.3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: darkBorder, width: 1),
        ),
        margin: const EdgeInsets.symmetric(vertical: 6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkSurface,
        labelStyle: const TextStyle(color: darkTextMuted, fontSize: 13, fontWeight: FontWeight.w500),
        hintStyle: const TextStyle(color: darkTextSecondary, fontSize: 13),
        prefixIconColor: darkTextMuted,
        suffixIconColor: darkTextMuted,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: darkBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: darkBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryLight, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primaryLight,
          foregroundColor: const Color(0xFF042F2E),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: darkSurface,
        elevation: 4,
        indicatorColor: primaryLight.withValues(alpha: 0.25),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(color: primaryLight, fontWeight: FontWeight.bold, fontSize: 12);
          }
          return const TextStyle(color: darkTextMuted, fontSize: 12);
        }),
      ),
    );
  }
}
