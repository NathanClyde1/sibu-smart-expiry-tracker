import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// `--dart-define=API_BASE_URL=http://192.168.1.20:4000` for a real device.
/// 10.0.2.2 is how the Android emulator reaches the host machine.
const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:4000',
);

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.role,
    required this.displayName,
  });

  final String id;
  final String email;
  final String role;
  final String displayName;

  bool get isAdmin => role == 'admin';

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
        displayName: json['displayName'] as String,
      );
}

class Session {
  const Session({required this.user, required this.accessToken});

  final AuthUser user;
  final String accessToken;
}

class ApiClient {
  ApiClient({this.baseUrl = apiBaseUrl, FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final String baseUrl;
  final FlutterSecureStorage _storage;

  static const _accessKey = 'seg.access_token';
  static const _refreshKey = 'seg.refresh_token';

  String? _accessToken;
  String? _refreshToken;

  AuthUser? user;

  Future<Session> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    final body = await _send(
      'POST',
      '/api/auth/register',
      body: {'email': email, 'password': password, 'displayName': displayName},
    );
    return _adopt(body as Map<String, dynamic>);
  }

  Future<Session> login({required String email, required String password}) async {
    final body = await _send(
      'POST',
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
    return _adopt(body as Map<String, dynamic>);
  }

  /// Rebuilds the session from the stored refresh token on app start.
  Future<bool> restore() async {
    _refreshToken = await _storage.read(key: _refreshKey);
    if (_refreshToken == null) return false;

    try {
      final body = await _send(
        'POST',
        '/api/auth/refresh',
        body: {'refreshToken': _refreshToken},
      );
      _adopt(body as Map<String, dynamic>);
      final me = await get('/api/auth/me');
      user = AuthUser.fromJson((me as Map<String, dynamic>)['user'] as Map<String, dynamic>);
      return true;
    } on ApiException {
      await _clear();
      return false;
    }
  }

  Future<void> logout() async {
    final token = _refreshToken;
    if (token != null) {
      // Best effort: a failed call must still clear the device.
      try {
        await _send('POST', '/api/auth/logout', body: {'refreshToken': token});
      } on ApiException {
        // ignored
      }
    }
    await _clear();
  }

  /// Authenticated GET with one transparent token refresh on 401.
  Future<Object?> get(String path) async {
    final response = await _authorized(path);
    if (response.statusCode != 401) return _decode(response);

    if (!await _refresh()) {
      throw ApiException('Session expired. Please sign in again.', statusCode: 401);
    }
    return _decode(await _authorized(path));
  }

  Future<http.Response> _authorized(String path) {
    return http
        .get(Uri.parse('$baseUrl$path'), headers: _headers())
        .timeout(const Duration(seconds: 20));
  }

  Future<bool> _refresh() async {
    final token = _refreshToken;
    if (token == null) return false;

    try {
      final body = await _send('POST', '/api/auth/refresh', body: {'refreshToken': token});
      _adopt(body as Map<String, dynamic>);
      return true;
    } on ApiException {
      await _clear();
      return false;
    }
  }

  Session _adopt(Map<String, dynamic> body) {
    _accessToken = body['accessToken'] as String;
    final rotated = body['refreshToken'] as String?;
    if (rotated != null) {
      _refreshToken = rotated;
      unawaited(_storage.write(key: _refreshKey, value: rotated));
    }
    unawaited(_storage.write(key: _accessKey, value: _accessToken));

    final session = Session(
      user: AuthUser.fromJson(body['user'] as Map<String, dynamic>),
      accessToken: _accessToken!,
    );
    user = session.user;
    return session;
  }

  Future<void> _clear() async {
    _accessToken = null;
    _refreshToken = null;
    user = null;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }

  Map<String, String> _headers({bool json = false}) => {
        if (json) 'Content-Type': 'application/json',
        'X-Client': 'mobile',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  Future<Object?> _send(String method, String path, {Object? body}) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'))
      ..headers.addAll(_headers(json: body != null));
    if (body != null) request.body = jsonEncode(body);

    final response = await http.Response.fromStream(await request.send())
        .timeout(const Duration(seconds: 20));
    return _decode(response);
  }

  Object? _decode(http.Response response) {
    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);

    if (response.statusCode >= 200 && response.statusCode < 300) return decoded;

    final message = decoded is Map<String, dynamic> ? decoded['error'] as String? : null;
    throw ApiException(message ?? 'Request failed (${response.statusCode})',
        statusCode: response.statusCode);
  }
}

/// Fire-and-forget for writes we do not need to await at the call site.
