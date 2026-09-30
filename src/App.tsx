/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { initializeStorageIfEmpty } from './services/storage';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './pages/AppLayout';
import { FeedPage } from './pages/FeedPage';
import { GamesPage } from './pages/GamesPage';
import { GameHostPage } from './pages/GameHostPage';
import { GamePlayPage } from './pages/GamePlayPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { OfflinePage } from './pages/OfflinePage';
import { AboutPage } from './pages/AboutPage';

// Import i18n
import './i18n';

export default function App() {
  useEffect(() => {
    initializeStorageIfEmpty();
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Landing */}
              <Route path="/" element={<LandingPage />} />

              {/* Authentication with Google Auth & Password Reset */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected App Routes */}
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="/app/feed" replace />} />
                <Route path="feed" element={<FeedPage />} />
                <Route path="games" element={<GamesPage />} />
                <Route path="games/host/:code" element={<GameHostPage />} />
                <Route path="games/play/:code" element={<GamePlayPage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="offline" element={<OfflinePage />} />
                <Route path="about" element={<AboutPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
