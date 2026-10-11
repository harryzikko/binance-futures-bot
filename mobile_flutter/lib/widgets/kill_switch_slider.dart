import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class KillSwitchSlider extends StatefulWidget {
  final Future<void> Function() onTrigger;

  const KillSwitchSlider({super.key, required this.onTrigger});

  @override
  State<KillSwitchSlider> createState() => _KillSwitchSliderState();
}

class _KillSwitchSliderState extends State<KillSwitchSlider> {
  double _dragPosition = 0.0;
  bool _isTriggered = false;
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxDrag = constraints.maxWidth - 50.0;

        return Container(
          height: 54,
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.bearish.withValues(alpha: 0.3)),
          ),
          child: Stack(
            children: [
              // Progress Fill
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: _dragPosition + 50.0,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.bearish.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),

              // Track Text Label
              Center(
                child: _isLoading
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.bearish),
                          ),
                          SizedBox(width: 8),
                          Text(
                            'ĐANG HỦY TOÀN BỘ VỊ THẾ...',
                            style: TextStyle(
                              color: AppColors.bearish,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.keyboard_double_arrow_right, color: AppColors.bearish.withValues(alpha: 0.8), size: 18),
                          const SizedBox(width: 6),
                          Text(
                            _isTriggered ? 'ĐÃ KÍCH HOẠT KILL SWITCH' : 'TRƯỢT ĐỂ HỦY TOÀN BỘ VỊ THẾ',
                            style: const TextStyle(
                              color: AppColors.bearish,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
              ),

              // Slider Thumb
              Positioned(
                left: _dragPosition,
                top: 3,
                bottom: 3,
                child: GestureDetector(
                  onHorizontalDragUpdate: (details) {
                    if (_isTriggered || _isLoading) return;
                    setState(() {
                      _dragPosition = (_dragPosition + details.delta.dx).clamp(0.0, maxDrag);
                    });
                  },
                  onHorizontalDragEnd: (details) async {
                    if (_isTriggered || _isLoading) return;
                    if (_dragPosition >= maxDrag * 0.82) {
                      setState(() {
                        _dragPosition = maxDrag;
                        _isLoading = true;
                      });
                      await widget.onTrigger();
                      setState(() {
                        _isLoading = false;
                        _isTriggered = true;
                      });
                      Future.delayed(const Duration(seconds: 4), () {
                        if (mounted) {
                          setState(() {
                            _dragPosition = 0.0;
                            _isTriggered = false;
                          });
                        }
                      });
                    } else {
                      // Spring back
                      setState(() {
                        _dragPosition = 0.0;
                      });
                    }
                  },
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.bearish,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.bearish.withValues(alpha: 0.5),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.power_settings_new,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
