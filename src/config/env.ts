const DEFAULT_API_BASE_URL = 'https://smart-solar-django-backend.vercel.app/api';

export const Env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
};

