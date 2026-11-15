import 'package:flutter/foundation.dart';

import 'api_client.dart';

enum AuthStatus { loading, signedOut, signedIn }

class AuthController extends ChangeNotifier {
  AuthController(this.api);

  final ApiClient api;

  AuthStatus status = AuthStatus.loading;
  String? error;

  AuthUser? get user => api.user;

  Future<void> bootstrap() async {
    final restored = await api.restore();
    status = restored ? AuthStatus.signedIn : AuthStatus.signedOut;
    notifyListeners();
  }

  Future<bool> login({required String email, required String password}) {
    return _run(() => api.login(email: email.trim(), password: password));
  }

  Future<bool> register({
    required String displayName,
    required String email,
    required String password,
  }) {
    return _run(
      () => api.register(displayName: displayName.trim(), email: email.trim(), password: password),
    );
  }

  Future<void> logout() async {
    await api.logout();
    status = AuthStatus.signedOut;
    error = null;
    notifyListeners();
  }

  Future<bool> _run(Future<Session> Function() action) async {
    error = null;
    notifyListeners();

    try {
      await action();
      status = AuthStatus.signedIn;
      notifyListeners();
      return true;
    } on ApiException catch (failure) {
      error = failure.message;
      notifyListeners();
      return false;
    } on Exception {
      error = 'Cannot reach the server. Check your connection and try again.';
      notifyListeners();
      return false;
    }
  }
}
