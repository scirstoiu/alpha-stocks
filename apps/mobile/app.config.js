export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrl: process.env.SUPABASE_URL || 'https://wrduytomojpmymcjmvwh.supabase.co',
    supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    apiUrl: process.env.API_URL || 'https://alpha-stocks-742708333282.europe-west1.run.app',
  },
});
