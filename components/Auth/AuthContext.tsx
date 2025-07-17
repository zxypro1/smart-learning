import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserAiModel {
  id: number;
  model_name: string;
  provider: string;
}

interface AuthContextType {
  token: string | null;
  login: (newToken: string, newAiModel: string | null, newAiApiKey: string | null, newAvatarUrl: string | null, newAiProvider: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
  aiModel: string | null;
  aiApiKey: string | null;
  avatarUrl: string | null;
  aiProvider: string | null; // Added aiProvider
  userAiModels: UserAiModel[];
  updateAiSettings: (model: string, apiKey: string, provider: string) => void; // Updated updateAiSettings
  updateAvatarUrl: (url: string | null) => void;
  fetchUserAiModels: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null); // Added aiProvider state
  const [userAiModels, setUserAiModels] = useState<UserAiModel[]>([]);

  const fetchUserAiModels = async () => {
    if (!token) {return};
    try {
      const response = await fetch('/api/userAiModels', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserAiModels(data.models);
      } else if (response.status === 401 || response.status === 403) {
        logout();
      } else {
        console.error('Failed to fetch user AI models');
        setUserAiModels([]);
      }
    } catch (error) {
      console.error('Error fetching user AI models:', error);
      setUserAiModels([]);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    const storedAiModel = localStorage.getItem('ai_model');
    const storedAiApiKey = localStorage.getItem('ai_api_key');
    const storedAvatarUrl = localStorage.getItem('avatar_url');
    const storedAiProvider = localStorage.getItem('ai_provider');

    if (storedToken) {
      setToken(storedToken);
      setAiModel(storedAiModel);
      setAiApiKey(storedAiApiKey);
      setAvatarUrl(storedAvatarUrl);
      setAiProvider(storedAiProvider);
    }
  }, []);

  useEffect(() => {
    fetchUserAiModels();
  }, [token]);

  const login = (newToken: string, newAiModel: string | null, newAiApiKey: string | null, newAvatarUrl: string | null, newAiProvider: string | null) => {
    setToken(newToken);
    setAiModel(newAiModel);
    setAiApiKey(newAiApiKey);
    setAvatarUrl(newAvatarUrl);
    setAiProvider(newAiProvider);
    localStorage.setItem('jwt_token', newToken);
    if (newAiModel) {
      localStorage.setItem('ai_model', newAiModel);
    } else {
      localStorage.removeItem('ai_model');
    }
    if (newAiApiKey) {
      localStorage.setItem('ai_api_key', newAiApiKey);
    } else {
      localStorage.removeItem('ai_api_key');
    }
    if (newAvatarUrl) {
      localStorage.setItem('avatar_url', newAvatarUrl);
    } else {
      localStorage.removeItem('avatar_url');
    }
    if (newAiProvider) {
      localStorage.setItem('ai_provider', newAiProvider);
    } else {
      localStorage.removeItem('ai_provider');
    }
  };

  const logout = () => {
    setToken(null);
    setAiModel(null);
    setAiApiKey(null);
    setAvatarUrl(null);
    setAiProvider(null); // Clear ai_provider on logout
    setUserAiModels([]);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('ai_model');
    localStorage.removeItem('ai_api_key');
    localStorage.removeItem('avatar_url');
    localStorage.removeItem('ai_provider'); // Clear ai_provider from local storage
  };

  const updateAiSettings = (model: string, apiKey: string, provider: string) => {
    setAiModel(model);
    setAiApiKey(apiKey);
    setAiProvider(provider); // Update aiProvider
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_api_key', apiKey);
    localStorage.setItem('ai_provider', provider); // Store aiProvider
  };

  const updateAvatarUrl = (url: string | null) => {
    setAvatarUrl(url);
    if (url) {
      localStorage.setItem('avatar_url', url);
    } else {
      localStorage.removeItem('avatar_url');
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated, aiModel, aiApiKey, avatarUrl, aiProvider, userAiModels, updateAiSettings, updateAvatarUrl, fetchUserAiModels }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
