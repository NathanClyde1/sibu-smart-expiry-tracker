import 'package:supabase_flutter/supabase_flutter.dart';

/// Everything the sign-in, sign-up and account screens need from Supabase.
///
/// Session storage is handled by `supabase_flutter` itself (platform secure
/// storage), so there is no token code here.
class AuthService {
  AuthService({SupabaseClient? client}) : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  User? get currentUser => _client.auth.currentUser;

  Session? get currentSession => _client.auth.currentSession;

  /// Emits on sign-in, sign-out and token refresh.
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  /// Creates a household account. A database trigger copies `full_name` into
  /// `public.profiles` and creates the row.
  ///
  /// When email confirmation is enabled, the returned session is null and the
  /// user must confirm before signing in.
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
  }) {
    return _client.auth.signUp(
      email: email.trim(),
      password: password,
      data: {'full_name': fullName.trim()},
    );
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) {
    return _client.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
  }

  Future<void> signOut() => _client.auth.signOut();

  /// Reads the admin flag from `profiles`.
  ///
  /// Returns false rather than throwing when the profile row is missing (the
  /// signup trigger not installed) or RLS hides it, so the UI never breaks.
  Future<bool> isAdmin() async {
    final user = currentUser;
    if (user == null) return false;

    try {
      final row = await _client
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();
      return row?['is_admin'] == true;
    } on PostgrestException {
      return false;
    }
  }
}

/// What to call this household on screen.
///
/// Prefers the name captured at signup, falls back to the email local part.
String householdName({Map<String, dynamic>? metadata, String? email}) {
  final name = metadata?['full_name'];
  if (name is String && name.trim().isNotEmpty) return name.trim();

  final address = email?.trim() ?? '';
  if (address.isEmpty) return 'Household';
  return address.split('@').first;
}

/// Convenience wrapper around [householdName] for the signed-in user.
String displayNameOf(User user) =>
    householdName(metadata: user.userMetadata, email: user.email);
