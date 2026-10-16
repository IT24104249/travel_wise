import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// An elegant, lightweight vector background providing subtle topographic contour
/// lines, travel waypoint arcs, and soft atmospheric lighting for travel aesthetics.
class TravelBackground extends StatelessWidget {
  final Widget child;

  const TravelBackground({required this.child, super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseBg = isDark ? AppTheme.darkBackground : AppTheme.lightBackground;

    return Stack(
      children: [
        // 1. Base solid background
        Positioned.fill(
          child: ColoredBox(color: baseBg),
        ),

        // 2. Soft Atmospheric Lighting (Subtle Teal & Warm Sunrise Golden Aura)
        Positioned.fill(
          child: CustomPaint(
            painter: _AtmosphericAuraPainter(isDark: isDark),
          ),
        ),

        // 3. Subtle Faded Travel Contours & Waypoint Arcs
        Positioned.fill(
          child: CustomPaint(
            painter: _TopographicTravelPainter(isDark: isDark),
          ),
        ),

        // 4. Foreground Content
        child,
      ],
    );
  }
}

/// Paints subtle atmospheric lighting halos to give depth and warm island character
class _AtmosphericAuraPainter extends CustomPainter {
  final bool isDark;

  const _AtmosphericAuraPainter({required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    // Top-right subtle teal aura
    final tealPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          (isDark ? const Color(0xFF0D9488) : const Color(0xFF14B8A6))
              .withValues(alpha: isDark ? 0.08 : 0.045),
          Colors.transparent,
        ],
        radius: 0.85,
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * 0.9, size.height * 0.12),
        radius: size.width * 0.8,
      ));

    canvas.drawCircle(
      Offset(size.width * 0.9, size.height * 0.12),
      size.width * 0.8,
      tealPaint,
    );

    // Mid-left subtle warm sunrise amber aura
    final amberPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          (isDark ? const Color(0xFFF59E0B) : const Color(0xFFFBBF24))
              .withValues(alpha: isDark ? 0.06 : 0.035),
          Colors.transparent,
        ],
        radius: 0.9,
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * 0.05, size.height * 0.45),
        radius: size.width * 0.75,
      ));

    canvas.drawCircle(
      Offset(size.width * 0.05, size.height * 0.45),
      size.width * 0.75,
      amberPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _AtmosphericAuraPainter oldDelegate) =>
      oldDelegate.isDark != isDark;
}

/// Paints faded topographic elevation contours, flight path curves, and compass points
class _TopographicTravelPainter extends CustomPainter {
  final bool isDark;

  const _TopographicTravelPainter({required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Line paints for subtle contours
    final contourColor = isDark
        ? const Color(0xFF38BDF8).withValues(alpha: 0.035) // Sky blue subtle
        : const Color(0xFF0D9488).withValues(alpha: 0.04); // Teal subtle

    final contourPaint = Paint()
      ..color = contourColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0
      ..isAntiAlias = true;

    final dashPaint = Paint()
      ..color = (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))
          .withValues(alpha: isDark ? 0.045 : 0.045)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1
      ..isAntiAlias = true;

    // 1. TOPOGRAPHIC CONTOUR CURVES (Mountains & Elevation Waves)
    _drawTopographicWave(canvas, contourPaint, w, 0.18 * h, amplitude: 24, frequency: 1.2);
    _drawTopographicWave(canvas, contourPaint, w, 0.28 * h, amplitude: 32, frequency: 0.9);
    _drawTopographicWave(canvas, contourPaint, w, 0.48 * h, amplitude: 28, frequency: 1.1);
    _drawTopographicWave(canvas, contourPaint, w, 0.68 * h, amplitude: 36, frequency: 0.8);
    _drawTopographicWave(canvas, contourPaint, w, 0.88 * h, amplitude: 22, frequency: 1.3);

    // 2. DASHED FLIGHT PATH / TRAVEL TRAJECTORY ARC
    final flightPath = Path();
    flightPath.moveTo(w * 0.08, h * 0.16);
    flightPath.cubicTo(
      w * 0.45, h * 0.08,
      w * 0.75, h * 0.22,
      w * 0.92, h * 0.32,
    );
    _drawDashedPath(canvas, flightPath, dashPaint, dashLength: 6, gapLength: 5);

    // Tiny waypoint dot at trajectory start and end
    final dotPaint = Paint()
      ..color = (isDark ? const Color(0xFF5EEAD4) : AppTheme.primary)
          .withValues(alpha: isDark ? 0.08 : 0.06)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(Offset(w * 0.08, h * 0.16), 3.5, dotPaint);
    canvas.drawCircle(Offset(w * 0.92, h * 0.32), 3.5, dotPaint);

    // 3. ELEGANT WATERMARK COMPASS STAR (Top Right)
    final compassCenter = Offset(w * 0.88, h * 0.08);
    _drawSubtleCompass(canvas, compassCenter, isDark ? 0.04 : 0.035);
  }

  void _drawTopographicWave(
    Canvas canvas,
    Paint paint,
    double width,
    double yOffset, {
    required double amplitude,
    required double frequency,
  }) {
    final path = Path();
    path.moveTo(0, yOffset);

    final segments = 4;
    final step = width / segments;

    for (int i = 0; i < segments; i++) {
      final x1 = (i + 0.5) * step;
      final y1 = yOffset + ((i % 2 == 0) ? -amplitude : amplitude) * frequency;
      final x2 = (i + 1) * step;
      final y2 = yOffset + ((i % 2 == 0) ? (amplitude * 0.4) : -(amplitude * 0.4));
      path.quadraticBezierTo(x1, y1, x2, y2);
    }

    canvas.drawPath(path, paint);
  }

  void _drawDashedPath(
    Canvas canvas,
    Path path,
    Paint paint, {
    required double dashLength,
    required double gapLength,
  }) {
    final metrics = path.computeMetrics();
    for (final metric in metrics) {
      double distance = 0.0;
      while (distance < metric.length) {
        final length = math.min(dashLength, metric.length - distance);
        final extract = metric.extractPath(distance, distance + length);
        canvas.drawPath(extract, paint);
        distance += dashLength + gapLength;
      }
    }
  }

  void _drawSubtleCompass(Canvas canvas, Offset center, double opacity) {
    final starColor = isDark
        ? const Color(0xFF38BDF8).withValues(alpha: opacity)
        : const Color(0xFF0F766E).withValues(alpha: opacity);

    final compassPaint = Paint()
      ..color = starColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.9;

    const radius = 22.0;

    // Cross lines
    canvas.drawLine(
      Offset(center.dx, center.dy - radius),
      Offset(center.dx, center.dy + radius),
      compassPaint,
    );
    canvas.drawLine(
      Offset(center.dx - radius, center.dy),
      Offset(center.dx + radius, center.dy),
      compassPaint,
    );

    // Diagonal subtle lines
    const diagRadius = radius * 0.6;
    canvas.drawLine(
      Offset(center.dx - diagRadius, center.dy - diagRadius),
      Offset(center.dx + diagRadius, center.dy + diagRadius),
      compassPaint,
    );
    canvas.drawLine(
      Offset(center.dx - diagRadius, center.dy + diagRadius),
      Offset(center.dx + diagRadius, center.dy - diagRadius),
      compassPaint,
    );

    // Subtle outer ring
    canvas.drawCircle(center, radius * 0.8, compassPaint);
  }

  @override
  bool shouldRepaint(covariant _TopographicTravelPainter oldDelegate) =>
      oldDelegate.isDark != isDark;
}
