import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class SparklineWidget extends StatelessWidget {
  final double height;
  final Color lineColor;

  const SparklineWidget({
    super.key,
    this.height = 42,
    this.lineColor = AppColors.bullish,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _SparklinePainter(lineColor: lineColor),
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final Color lineColor;

  _SparklinePainter({required this.lineColor});

  @override
  void paint(Canvas canvas, Size size) {
    final points = [
      Offset(0, size.height * 0.85),
      Offset(size.width * 0.15, size.height * 0.75),
      Offset(size.width * 0.35, size.height * 0.65),
      Offset(size.width * 0.55, size.height * 0.40),
      Offset(size.width * 0.75, size.height * 0.50),
      Offset(size.width * 0.90, size.height * 0.20),
      Offset(size.width, size.height * 0.10),
    ];

    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (int i = 1; i < points.length; i++) {
      final p0 = points[i - 1];
      final p1 = points[i];
      final cx = (p0.dx + p1.dx) / 2;
      path.cubicTo(cx, p0.dy, cx, p1.dy, p1.dx, p1.dy);
    }

    // Gradient Fill Under Path
    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          lineColor.withValues(alpha: 0.3),
          lineColor.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawPath(fillPath, fillPaint);

    // Stroke line
    final strokePaint = Paint()
      ..color = lineColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, strokePaint);

    // End beacon dot
    canvas.drawCircle(
      points.last,
      4.0,
      Paint()..color = AppColors.primaryContainer,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
