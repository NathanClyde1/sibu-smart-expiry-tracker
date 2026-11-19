import 'package:flutter/material.dart';

/// Bordered surface used by every feature screen.
///
/// Lives in `core/` so four developers do not invent four card styles. Treat it
/// as read-only: if a screen needs a different surface, pass a different
/// [padding] rather than copying the decoration.
class SurfaceCard extends StatelessWidget {
  const SurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDFE7E2)),
      ),
      child: child,
    );
  }
}
