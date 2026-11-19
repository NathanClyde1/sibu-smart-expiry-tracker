import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'services/auth_service.dart';
import 'src/config.dart';
import 'src/pages/account_page.dart';
import 'src/pages/login_page.dart';

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
      theme: _theme(),
      home: session == null
          ? LoginPage(auth: _auth)
          : AccountPage(auth: _auth, user: session.user),
    );
  }
}

ThemeData _theme() {
  final scheme = ColorScheme.fromSeed(seedColor: const Color(0xFF1F7A52));

  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    scaffoldBackgroundColor: const Color(0xFFF3F6F4),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDFE7E2)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDFE7E2)),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
