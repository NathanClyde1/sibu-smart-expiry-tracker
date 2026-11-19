import 'package:flutter/material.dart';

import '../../../core/widgets/surface_card.dart';

/// Owner: Dashboard developer (`feature/dashboard-*`).
///
/// TODO(pantry): read `pantry_items` (item_name, expiry_date, category,
/// quantity) for the signed-in household and replace the empty state below.
/// Keep the class name and the `const DashboardScreen()` constructor — the
/// navigation shell depends on both.
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Pantry'),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          const _CountdownLegend(),
          const SizedBox(height: 16),
          SurfaceCard(
            child: Column(
              children: [
                const Icon(Icons.kitchen_outlined, size: 36, color: Color(0xFF1F7A52)),
                const SizedBox(height: 12),
                Text(
                  'No items tracked yet',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Scan a receipt or add a grocery item to start the expiry countdown.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF5D6F66)),
                ),
                const SizedBox(height: 16),
                FilledButton.tonalIcon(
                  onPressed: null,
                  icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                  label: const Text('Add item (not built yet)'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Row(
            children: [
              Expanded(child: _StatTile(label: 'Items saved', value: '—')),
              SizedBox(width: 12),
              Expanded(child: _StatTile(label: 'Waste avoided', value: '—')),
            ],
          ),
        ],
      ),
    );
  }
}

/// The colour code the countdown will use. Kept visible so the dashboard
/// developer and the designer agree on thresholds before the list exists.
class _CountdownLegend extends StatelessWidget {
  const _CountdownLegend();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: const [
        _LegendChip(label: 'Expired / today', color: Color(0xFFB3352F)),
        _LegendChip(label: '1–3 days', color: Color(0xFFC08A1E)),
        _LegendChip(label: '4+ days', color: Color(0xFF1F7A52)),
      ],
    );
  }
}

class _LegendChip extends StatelessWidget {
  const _LegendChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF5D6F66)),
          ),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
