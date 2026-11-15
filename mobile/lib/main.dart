import 'package:flutter/material.dart';

import 'src/api_client.dart';
import 'src/auth_controller.dart';
import 'src/pages/account_page.dart';
import 'src/pages/login_page.dart';

void main() => runApp(const SmartExpiryApp());

class SmartExpiryApp extends StatefulWidget {
  const SmartExpiryApp({super.key});

  @override
  State<SmartExpiryApp> createState() => _SmartExpiryAppState();
}

class _SmartExpiryAppState extends State<SmartExpiryApp> {
  late final AuthController _auth;

  @override
  void initState() {
    super.initState();
    _auth = AuthController(ApiClient());
    _auth.addListener(_onAuthChanged);
    _auth.bootstrap();
  }

  void _onAuthChanged() => setState(() {});

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    _auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sibu Disposal Guide',
      debugShowCheckedModeBanner: false,
      theme: _theme(),
      home: switch (_auth.status) {
        AuthStatus.loading => const _Splash(),
        AuthStatus.signedOut => LoginPage(auth: _auth),
        AuthStatus.signedIn => AccountPage(auth: _auth),
      },
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

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.recycling, size: 48, color: Color(0xFF1F7A52)),
            SizedBox(height: 16),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
