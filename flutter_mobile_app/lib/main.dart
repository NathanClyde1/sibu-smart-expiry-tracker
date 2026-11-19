import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config.dart';
import 'core/theme.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/auth/services/auth_service.dart';
import 'features/shell/main_navigation_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );

  runApp(const SmartExpiryApp());
}

class SmartExpiryApp extends StatefulWidget {
  const SmartExpiryApp({super.key});

  @override
  State<SmartExpiryApp> createState() => _SmartExpiryAppState();
}

class _SmartExpiryAppState extends State<SmartExpiryApp> {
  final AuthService _auth = AuthService();

  Session? _session;
  late final StreamSubscription<AuthState> _subscription;

  @override
  void initState() {
    super.initState();

    // Restores an existing session across app restarts, then tracks changes.
    _session = _auth.currentSession;
    _subscription = _auth.authStateChanges.listen((state) {
      if (!mounted) return;
      setState(() => _session = state.session);
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;

    return MaterialApp(
      title: 'Sibu Disposal Guide',
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      home: session == null
          ? LoginScreen(auth: _auth)
          : MainNavigationScreen(auth: _auth, user: session.user),
    );
  }
}
