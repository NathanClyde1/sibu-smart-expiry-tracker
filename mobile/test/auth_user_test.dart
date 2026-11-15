import 'package:flutter_test/flutter_test.dart';
import 'package:smart_expiry_guide/src/api_client.dart';

void main() {
  test('parses a household user from the API', () {
    final user = AuthUser.fromJson({
      'id': 'u1',
      'email': 'tan@example.com',
      'role': 'household',
      'displayName': 'Tan Household',
    });

    expect(user.email, 'tan@example.com');
    expect(user.displayName, 'Tan Household');
    expect(user.isAdmin, isFalse);
  });

  test('flags admin accounts', () {
    final user = AuthUser.fromJson({
      'id': 'u2',
      'email': 'admin@sibu.gov.my',
      'role': 'admin',
      'displayName': 'Sibu Council Admin',
    });

    expect(user.isAdmin, isTrue);
  });
}
