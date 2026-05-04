import React, { createContext, useState, useEffect, useContext } from 'react';
import { getApiKey, saveApiKey as storageSaveApiKey } from '../utils/storage';
import ApiKeySetupModal from '../components/ApiKeySetupModal';

const ApiContext = createContext();

export const useApi = () => useContext(ApiContext);

export const ApiProvider = ({ children }) => {
  const [hasKey, setHasKey] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    const key = await getApiKey();
    if (key) {
      setHasKey(true);
    } else {
      setHasKey(false);
      // Show on startup if no key
      setModalVisible(true);
    }
    setIsInitializing(false);
  };

  const requestKey = () => {
    setModalVisible(true);
  };

  const skipKey = () => {
    setModalVisible(false);
  };

  const saveKey = async (key) => {
    await storageSaveApiKey(key);
    setHasKey(true);
    setModalVisible(false);
  };

  if (isInitializing) return null;

  return (
    <ApiContext.Provider value={{ hasKey, requestKey, skipKey }}>
      {children}
      {isModalVisible && (
        <ApiKeySetupModal
          onKeySaved={saveKey}
          onSkip={skipKey}
        />
      )}
    </ApiContext.Provider>
  );
};
