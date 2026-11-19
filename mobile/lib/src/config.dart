/// Supabase project settings.
///
/// The publishable (anon) key is designed to ship inside clients - it grants
/// only what the row-level security policies allow. Never put the service_role
/// / secret key here.
///
/// Override at build time:
///   flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
const supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://ywyxdmsroaqmaqyoovgb.supabase.co',
);

const supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue: 'sb_publishable_c_BuMG5FzaImB-ATP3sFjg_W0DIKtUi',
);
