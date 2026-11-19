import 'package:flutter/material.dart';

import '../../../core/widgets/surface_card.dart';

/// Owner: Sync & alerts developer (`feature/sync-alerts-*`).
///
/// TODO(alerts): schedule local notifications 3 days and 1 day before
/// `pantry_items.expiry_date`, persist the toggles locally, and show real sync
/// state instead of the placeholder text. Keep the class name and const
/// constructor.
class SyncAlertsScreen extends StatelessWidget {
  const SyncAlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Alerts'),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          SurfaceCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SwitchListTile(
                  value: true,
                  onChanged: null,
                  title: const Text('3 days before expiry'),
                  subtitle: const Text('A reminder while there is still time to cook it'),
                ),
                const Divider(height: 1, color: Color(0xFFDFE7E2)),
                SwitchListTile(
                  value: true,
                  onChanged: null,
                  title: const Text('1 day before expiry'),
                  subtitle: const Text('Last call before it becomes waste'),
                ),
                const Divider(height: 1, color: Color(0xFFDFE7E2)),
                SwitchListTile(
                  value: false,
                  onChanged: null,
                  title: const Text('Weekly waste summary'),
                  subtitle: const Text('Not built yet'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const SurfaceCard(
            child: Row(
              children: [
                Icon(Icons.cloud_done_outlined, size: 22, color: Color(0xFF1F7A52)),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Not syncing yet',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Offline cache and background refresh land with this feature.',
                        style: TextStyle(fontSize: 12.5, color: Color(0xFF5D6F66)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
