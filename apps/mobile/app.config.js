export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    apiUrl: process.env.API_URL || '',
  },
});
