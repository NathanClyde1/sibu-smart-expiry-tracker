import 'package:flutter_test/flutter_test.dart';
import 'package:smart_expiry_guide/services/auth_service.dart';

void main() {
  group('householdName', () {
    test('prefers the name captured at signup', () {
      expect(
        householdName(metadata: {'full_name': '  Tan Household '}, email: 'tan@example.com'),
        'Tan Household',
      );
    });

    test('falls back to the email local part', () {
      expect(householdName(metadata: {}, email: 'lim@example.com'), 'lim');
      expect(householdName(metadata: null, email: 'lim@example.com'), 'lim');
    });

    test('ignores a blank name', () {
      expect(householdName(metadata: {'full_name': '   '}, email: 'abu@example.com'), 'abu');
    });

    test('survives a user with no email', () {
      expect(householdName(metadata: null, email: null), 'Household');
    });
  });
}
