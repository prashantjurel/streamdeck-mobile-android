import React, { createContext, useState, useContext } from 'react';
import MediaDetailsModal from '../components/MediaDetailsModal';

export const MediaDetailsContext = createContext();

export const useMediaDetails = () => useContext(MediaDetailsContext);

export const MediaDetailsProvider = ({ children }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMediaForDetails, setSelectedMediaForDetails] = useState(null);

  const openMediaDetails = (item) => {
    setSelectedMediaForDetails(item);
    setShowDetailsModal(true);
  };

  const closeMediaDetails = () => {
    setShowDetailsModal(false);
    setSelectedMediaForDetails(null);
  };

  return (
    <MediaDetailsContext.Provider value={{ openMediaDetails, closeMediaDetails }}>
      {children}
      <MediaDetailsModal
        visible={showDetailsModal}
        mediaItem={selectedMediaForDetails}
        onClose={closeMediaDetails}
      />
    </MediaDetailsContext.Provider>
  );
};
