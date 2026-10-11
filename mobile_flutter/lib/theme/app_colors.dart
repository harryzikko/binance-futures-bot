import 'package:flutter/material.dart';

class AppColors {
  // Obsidian Algorithmic Terminal Surface Tokens
  static const Color surface = Color(0xFF10131A);
  static const Color surfaceDim = Color(0xFF10131A);
  static const Color surfaceBright = Color(0xFF363940);
  static const Color surfaceContainerLowest = Color(0xFF0B0E14);
  static const Color surfaceContainerLow = Color(0xFF191C22);
  static const Color surfaceContainer = Color(0xFF1D2026);
  static const Color surfaceContainerHigh = Color(0xFF272A31);
  static const Color surfaceContainerHighest = Color(0xFF32353C);

  // Typography & Content Contrast
  static const Color onSurface = Color(0xFFE1E2EB);
  static const Color onSurfaceVariant = Color(0xFF8E929E);
  static const Color onSurfaceMuted = Color(0xFF5B606D);
  static const Color outline = Color(0xFF2E323D);
  static const Color outlineVariant = Color(0xFF1E222A);

  // Binance Brand Accent
  static const Color primary = Color(0xFFFFD87F);
  static const Color primaryContainer = Color(0xFFF0B90B); // Binance Gold
  static const Color onPrimary = Color(0xFF251A00);

  // Financial Bullish / Bearish
  static const Color bullish = Color(0xFF0ECB81); // Binance Green
  static const Color bullishGlow = Color(0xFF3BE194);
  static const Color bullishBg = Color(0x1A0ECB81);

  static const Color bearish = Color(0xFFF6465D); // Binance Red
  static const Color bearishGlow = Color(0xFFFFB4AB);
  static const Color bearishBg = Color(0x1AF6465D);

  static const Color errorContainer = Color(0xFF93000A);
  static const Color onErrorContainer = Color(0xFFFFDAD6);

  // Secondary Accents
  static const Color secondary = Color(0xFFACC7FF);
  static const Color secondaryContainer = Color(0xFF0162CB);

  // Gradients
  static const LinearGradient cardGlow = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0x15F0B90B), Color(0x00000000)],
  );

  static const LinearGradient killSwitchTrack = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0x33F6465D), Color(0x11F6465D)],
  );
}
