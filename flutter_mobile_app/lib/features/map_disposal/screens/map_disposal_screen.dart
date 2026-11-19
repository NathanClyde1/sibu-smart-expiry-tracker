import 'package:flutter/material.dart';

import '../../../core/widgets/surface_card.dart';

/// Owner: Map & disposal developer (`feature/map-disposal-*`).
///
/// TODO(map): read `recycling_centers` (name, address, latitude, longitude,
/// accepted_materials) from Supabase, plot the verified Sibu drop-offs, and
/// launch the device maps app from a "Navigate" button. Replace the
/// placeholder panel below; keep the class name and const constructor.
class MapDisposalScreen extends StatelessWidget {
  const MapDisposalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Disposal guide'),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          // Reserve the space the real map will occupy so the layout is
          // already agreed before the map package is added.
          AspectRatio(
            aspectRatio: 4 / 3,
            child: SurfaceCard(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.map_outlined, size: 40, color: Color(0xFF1F7A52)),
                    const SizedBox(height: 12),
                    Text(
                      'Map placeholder',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 6),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        'Verified Sibu drop-off points will appear here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: Color(0xFF5D6F66)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const SurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'How disposal works here',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
                SizedBox(height: 8),
                Text(
                  'Sibu has no public compost bins, so food scraps go to a home compost. '
                  'Everything else is routed to the nearest centre that accepts it.',
                  style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF5D6F66)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
